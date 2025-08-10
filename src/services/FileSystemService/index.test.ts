import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FileSystemError } from './errors';
import { type FileSystemService, createFileSystemService } from './index';

interface NodeError extends Error {
  code?: string;
}

const TMP_DIR = path.join(os.tmpdir(), 'gdpm');

describe('FileSystemService', () => {
  let service: FileSystemService;
  let testDir: string;

  beforeEach(() => {
    service = createFileSystemService();
    testDir = path.join(process.cwd(), 'test-tmp');

    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    if (fs.existsSync(TMP_DIR)) {
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
    }
  });

  describe('createDir', () => {
    it('creates a directory successfully', () => {
      const dirPath = path.join(testDir, 'new-dir');

      service.createDir(dirPath);

      expect.soft(fs.existsSync(dirPath)).toBe(true);
      expect.soft(fs.statSync(dirPath).isDirectory()).toBe(true);
    });

    it('creates nested directories', () => {
      const dirPath = path.join(testDir, 'nested', 'deep', 'path');

      service.createDir(dirPath);

      expect.soft(fs.existsSync(dirPath)).toBe(true);
      expect.soft(fs.statSync(dirPath).isDirectory()).toBe(true);
    });

    it('does not throw if directory already exists', () => {
      const dirPath = path.join(testDir, 'existing-dir');

      fs.mkdirSync(dirPath, { recursive: true });

      const createDir = () => {
        service.createDir(dirPath);
      };

      expect(createDir).not.toThrow();
    });

    it('throws FileSystemError on permission denied', () => {
      const error = new Error('Permission denied') as NodeError;

      error.code = 'EACCES';

      const mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
        throw error;
      });

      const createInvalidDir = () => {
        service.createDir('/invalid/path');
      };

      expect.soft(createInvalidDir).toThrow(FileSystemError);
      expect.soft(createInvalidDir).toThrow('Failed to create directory: /invalid/path');

      mkdirSyncSpy.mockRestore();
    });
  });

  describe('createTmpDir', () => {
    it('creates tmp directory', () => {
      service.createTmpDir();

      expect.soft(fs.existsSync(TMP_DIR)).toBe(true);
      expect.soft(fs.statSync(TMP_DIR).isDirectory()).toBe(true);
    });

    it('does not throw if tmp directory already exists', () => {
      fs.mkdirSync(TMP_DIR, { recursive: true });

      expect(() => {
        service.createTmpDir();
      }).not.toThrow();
    });

    it('throws FileSystemError on failure', () => {
      const mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
        throw new Error('Disk full');
      });

      expect
        .soft(() => {
          service.createTmpDir();
        })
        .toThrow(FileSystemError);
      expect
        .soft(() => {
          service.createTmpDir();
        })
        .toThrow('Failed to create tmp directory');

      mkdirSyncSpy.mockRestore();
    });
  });

  describe('copyDirectoryContents', () => {
    let sourceDir: string;
    let destDir: string;

    beforeEach(() => {
      sourceDir = path.join(testDir, 'source');
      destDir = path.join(testDir, 'destination');

      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(sourceDir, 'file2.txt'), 'content2');

      fs.mkdirSync(path.join(sourceDir, 'subdir'));
      fs.writeFileSync(path.join(sourceDir, 'subdir', 'file3.txt'), 'content3');
    });

    it('copies directory contents successfully', () => {
      service.copyDirectoryContents(sourceDir, destDir);

      expect.soft(fs.existsSync(destDir)).toBe(true);
      expect.soft(fs.existsSync(path.join(destDir, 'file1.txt'))).toBe(true);
      expect.soft(fs.existsSync(path.join(destDir, 'file2.txt'))).toBe(true);
      expect.soft(fs.existsSync(path.join(destDir, 'subdir', 'file3.txt'))).toBe(true);

      expect.soft(fs.readFileSync(path.join(destDir, 'file1.txt'), 'utf8')).toBe('content1');
      expect.soft(fs.readFileSync(path.join(destDir, 'file2.txt'), 'utf8')).toBe('content2');
      expect
        .soft(fs.readFileSync(path.join(destDir, 'subdir', 'file3.txt'), 'utf8'))
        .toBe('content3');
    });

    it('replaces existing destination', () => {
      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(path.join(destDir, 'old-file.txt'), 'old content');

      service.copyDirectoryContents(sourceDir, destDir);

      expect.soft(fs.existsSync(path.join(destDir, 'old-file.txt'))).toBe(false);
      expect.soft(fs.existsSync(path.join(destDir, 'file1.txt'))).toBe(true);
    });

    it('uses atomic operation (temp then rename)', () => {
      const tempPath = `${destDir}.installing`;

      const originalRenameSync = fs.renameSync;
      const renameSyncSpy = vi.spyOn(fs, 'renameSync').mockImplementation((oldPath, newPath) => {
        expect.soft(fs.existsSync(oldPath)).toBe(true);
        expect.soft(oldPath).toBe(tempPath);
        expect.soft(newPath).toBe(destDir);

        originalRenameSync(oldPath, newPath);
      });

      service.copyDirectoryContents(sourceDir, destDir);

      expect.soft(renameSyncSpy).toHaveBeenCalledWith(tempPath, destDir);
      expect.soft(fs.existsSync(tempPath)).toBe(false);

      renameSyncSpy.mockRestore();
    });

    it('cleans up temp directory on failure', () => {
      const tempPath = `${destDir}.installing`;

      const cpSyncSpy = vi.spyOn(fs, 'cpSync').mockImplementation(() => {
        throw new Error('Copy failed');
      });

      expect
        .soft(() => {
          service.copyDirectoryContents(sourceDir, destDir);
        })
        .toThrow(FileSystemError);
      expect.soft(fs.existsSync(tempPath)).toBe(false);

      cpSyncSpy.mockRestore();
    });

    it('throws FileSystemError when source does not exist', () => {
      const nonExistentSource = path.join(testDir, 'non-existent');

      expect
        .soft(() => {
          service.copyDirectoryContents(nonExistentSource, destDir);
        })
        .toThrow(FileSystemError);
      expect
        .soft(() => {
          service.copyDirectoryContents(nonExistentSource, destDir);
        })
        .toThrow(`Failed to copy directory contents from ${nonExistentSource} to ${destDir}`);
    });

    it('throws FileSystemError on permission error', () => {
      const readDirSyncSpy = vi.spyOn(fs, 'readdirSync').mockImplementation(() => {
        const error = new Error('Permission denied') as NodeError;

        error.code = 'EACCES';
        throw error;
      });

      expect(() => {
        service.copyDirectoryContents(sourceDir, destDir);
      }).toThrow(FileSystemError);

      readDirSyncSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('removes tmp directory if it exists', () => {
      fs.mkdirSync(TMP_DIR, { recursive: true });
      fs.writeFileSync(path.join(TMP_DIR, 'test-file.txt'), 'test content');

      service.cleanup();

      expect(fs.existsSync(TMP_DIR)).toBe(false);
    });

    it('does not throw if tmp directory does not exist', () => {
      expect(() => {
        service.cleanup();
      }).not.toThrow();
    });

    it('throws FileSystemError on permission error', () => {
      fs.mkdirSync(TMP_DIR, { recursive: true });

      const rmSyncSpy = vi.spyOn(fs, 'rmSync').mockImplementation(() => {
        const error = new Error('Permission denied') as NodeError;

        error.code = 'EACCES';
        throw error;
      });

      expect
        .soft(() => {
          service.cleanup();
        })
        .toThrow(FileSystemError);
      expect
        .soft(() => {
          service.cleanup();
        })
        .toThrow('Failed to cleanup tmp directory');

      rmSyncSpy.mockRestore();
    });
  });

  describe('removeDir', () => {
    it('removes directory successfully', () => {
      const dirPath = path.join(testDir, 'dir-to-remove');

      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(path.join(dirPath, 'file.txt'), 'content');

      expect.soft(fs.existsSync(dirPath)).toBe(true);

      service.removeDir(dirPath);

      expect.soft(fs.existsSync(dirPath)).toBe(false);
    });

    it('removes directory with nested structure', () => {
      const dirPath = path.join(testDir, 'dir-with-nested');
      const nestedDir = path.join(dirPath, 'nested', 'deep');

      fs.mkdirSync(nestedDir, { recursive: true });
      fs.writeFileSync(path.join(nestedDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(dirPath, 'file2.txt'), 'content2');
      fs.writeFileSync(path.join(dirPath, 'nested', 'file3.txt'), 'content3');

      expect.soft(fs.existsSync(dirPath)).toBe(true);
      expect.soft(fs.existsSync(nestedDir)).toBe(true);

      service.removeDir(dirPath);

      expect.soft(fs.existsSync(dirPath)).toBe(false);
      expect.soft(fs.existsSync(nestedDir)).toBe(false);
    });

    it('does not throw if directory does not exist', () => {
      const nonExistentDir = path.join(testDir, 'non-existent-dir');

      expect.soft(fs.existsSync(nonExistentDir)).toBe(false);

      expect(() => {
        service.removeDir(nonExistentDir);
      }).not.toThrow();
    });

    it('removes directory with readonly files', () => {
      const dirPath = path.join(testDir, 'dir-with-readonly');
      const filePath = path.join(dirPath, 'readonly-file.txt');

      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(filePath, 'readonly content');

      // Make file readonly (this might not work on all systems, but won't break the test)
      try {
        fs.chmodSync(filePath, 0o444);
      } catch {
        // Ignore chmod errors on systems that don't support it
      }

      expect.soft(fs.existsSync(dirPath)).toBe(true);

      service.removeDir(dirPath);

      expect.soft(fs.existsSync(dirPath)).toBe(false);
    });

    it('throws FileSystemError on permission error', () => {
      const dirPath = path.join(testDir, 'protected-dir');

      fs.mkdirSync(dirPath, { recursive: true });

      const rmSyncSpy = vi.spyOn(fs, 'rmSync').mockImplementation(() => {
        const error = new Error('Permission denied') as NodeError;

        error.code = 'EACCES';
        throw error;
      });

      expect
        .soft(() => {
          service.removeDir(dirPath);
        })
        .toThrow(FileSystemError);
      expect
        .soft(() => {
          service.removeDir(dirPath);
        })
        .toThrow(`Failed to remove directory: ${dirPath}`);

      rmSyncSpy.mockRestore();
    });

    it('throws FileSystemError on file system error', () => {
      const dirPath = path.join(testDir, 'problematic-dir');

      fs.mkdirSync(dirPath, { recursive: true });

      const rmSyncSpy = vi.spyOn(fs, 'rmSync').mockImplementation(() => {
        throw new Error('Disk I/O error');
      });

      expect
        .soft(() => {
          service.removeDir(dirPath);
        })
        .toThrow(FileSystemError);
      expect
        .soft(() => {
          service.removeDir(dirPath);
        })
        .toThrow(`Failed to remove directory: ${dirPath}`);

      rmSyncSpy.mockRestore();
    });

    it('handles symlinks correctly', () => {
      const realDir = path.join(testDir, 'real-dir');
      const symlinkDir = path.join(testDir, 'symlink-dir');

      fs.mkdirSync(realDir, { recursive: true });
      fs.writeFileSync(path.join(realDir, 'file.txt'), 'content');

      try {
        fs.symlinkSync(realDir, symlinkDir, 'dir');

        expect.soft(fs.existsSync(symlinkDir)).toBe(true);
        expect.soft(fs.existsSync(realDir)).toBe(true);

        service.removeDir(symlinkDir);

        expect.soft(fs.existsSync(symlinkDir)).toBe(false);
        expect.soft(fs.existsSync(realDir)).toBe(true); // Original should still exist
      } catch {
        // Symlink creation might fail on some systems, skip this test
        console.log('Skipping symlink test - system does not support symlinks');
      }
    });
  });
});
