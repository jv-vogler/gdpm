import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FileSystemService } from '@/services/FileSystemService';
import { ManifestError } from '@/services/ManifestService/errors';
import { createManifestService } from '@/services/ManifestService/index';
import type { Manifest, Package } from '@/types';

describe('ManifestService', () => {
  let mockFileSystem: FileSystemService;
  let service: ReturnType<typeof createManifestService>;

  const validManifest: Manifest = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      'test-package': {
        version: '2.0.0',
        source: 'https://github.com/test/package.git',
      },
    },
  };

  const testPackage: Package = {
    name: 'new-package',
    version: '1.5.0',
    source: 'https://github.com/test/new-package.git',
  };

  beforeEach(() => {
    mockFileSystem = {
      exists: vi.fn(),
      readJson: vi.fn(),
      writeFile: vi.fn(),
      currentFolderName: vi.fn(),
      createDir: vi.fn(),
    } as unknown as FileSystemService;

    service = createManifestService({ FileSystem: mockFileSystem });
  });

  describe('exists', () => {
    it('should return true when manifest file exists', () => {
      vi.mocked(mockFileSystem.exists).mockReturnValue(true);

      const result = service.exists();

      expect.soft(result).toBe(true);
      expect.soft(mockFileSystem.exists).toHaveBeenCalledWith('project/godot-package.json');
    });

    it('should return false when manifest file does not exist', () => {
      vi.mocked(mockFileSystem.exists).mockReturnValue(false);

      const result = service.exists();

      expect.soft(result).toBe(false);
      expect.soft(mockFileSystem.exists).toHaveBeenCalledWith('project/godot-package.json');
    });
  });

  describe('read', () => {
    it('should read and parse valid manifest file', () => {
      vi.mocked(mockFileSystem.readJson).mockReturnValue(validManifest);

      const result = service.read();

      expect.soft(result).toEqual(validManifest);
      expect.soft(mockFileSystem.readJson).toHaveBeenCalledWith('project/godot-package.json');
    });

    it('should throw ManifestError for invalid manifest structure', () => {
      const invalidManifest = {
        name: 'test-project',
        version: 'invalid-version',
        dependencies: {},
      };

      vi.mocked(mockFileSystem.readJson).mockReturnValue(invalidManifest);

      const readFn = () => {
        service.read();
      };

      expect.soft(readFn).toThrow(ManifestError);
      expect.soft(readFn).toThrow('Invalid manifest file: project/godot-package.json');
    });

    it('should throw ManifestError for missing required fields', () => {
      const invalidManifest = {
        version: '1.0.0',
        dependencies: {},
      };

      vi.mocked(mockFileSystem.readJson).mockReturnValue(invalidManifest);

      const readFn = () => {
        service.read();
      };

      expect(readFn).toThrow(ManifestError);
    });
  });

  describe('write', () => {
    it('should write manifest to file successfully', () => {
      service.write(validManifest);

      const expectedContent = JSON.stringify(validManifest, null, 2);

      expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
        'project/godot-package.json',
        expectedContent,
      );
    });

    it('should throw ManifestError when file write fails', () => {
      const writeError = new Error('Permission denied');

      vi.mocked(mockFileSystem.writeFile).mockImplementation(() => {
        throw writeError;
      });

      const writeFn = () => {
        service.write(validManifest);
      };

      expect.soft(writeFn).toThrow(ManifestError);
      expect.soft(writeFn).toThrow('Failed to write manifest file: project/godot-package.json');
    });
  });

  describe('findPkg', () => {
    it('should find existing package in manifest', () => {
      const result = service.findPkg({ manifest: validManifest, name: 'test-package' });

      expect(result).toEqual({
        version: '2.0.0',
        source: 'https://github.com/test/package.git',
      });
    });

    it('should return null for non-existent package', () => {
      const result = service.findPkg({ manifest: validManifest, name: 'non-existent' });

      expect(result).toBeNull();
    });

    it('should return null for invalid package structure', () => {
      const manifestWithInvalidPkg = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'invalid-pkg': 'not-an-object',
        },
      } as unknown as Manifest;

      const result = service.findPkg({ manifest: manifestWithInvalidPkg, name: 'invalid-pkg' });

      expect(result).toBeNull();
    });
  });

  describe('install', () => {
    it('should add new package to dependencies', () => {
      vi.mocked(mockFileSystem.readJson).mockReturnValue(validManifest);

      const result = service.install({ pkg: testPackage });

      expect.soft(result.dependencies[testPackage.name]).toEqual(testPackage);
      expect
        .soft(result.dependencies['test-package'])
        .toEqual(validManifest.dependencies['test-package']);
    });

    it('should replace existing package with same name', () => {
      const updatedPackage: Package = {
        name: 'test-package',
        version: '3.0.0',
        source: 'https://github.com/test/updated-package.git',
      };

      vi.mocked(mockFileSystem.readJson).mockReturnValue(validManifest);

      const result = service.install({ pkg: updatedPackage });

      expect(result.dependencies['test-package']).toEqual(updatedPackage);
    });

    it('should handle installing to manifest with no dependencies', () => {
      const emptyManifest: Manifest = {
        name: 'empty-project',
        version: '1.0.0',
        dependencies: {},
      };

      vi.mocked(mockFileSystem.readJson).mockReturnValue(emptyManifest);

      const result = service.install({ pkg: testPackage });

      expect.soft(result.dependencies[testPackage.name]).toEqual(testPackage);
      expect.soft(Object.keys(result.dependencies)).toHaveLength(1);
    });
  });

  describe('uninstall', () => {
    it('should remove existing package from dependencies', () => {
      const packageToRemove: Package = {
        name: 'test-package',
        version: '2.0.0',
        source: 'https://github.com/test/package.git',
      };

      vi.mocked(mockFileSystem.readJson).mockReturnValue(validManifest);

      const result = service.uninstall({ pkg: packageToRemove });

      expect.soft(result.dependencies['test-package']).toBeUndefined();
      expect.soft(Object.keys(result.dependencies)).toHaveLength(0);
    });

    it('should return unchanged manifest when package does not exist', () => {
      const nonExistentPackage: Package = {
        name: 'non-existent',
        version: '1.0.0',
      };

      vi.mocked(mockFileSystem.readJson).mockReturnValue(validManifest);

      const result = service.uninstall({ pkg: nonExistentPackage });

      expect.soft(result).toEqual(validManifest);
      expect
        .soft(result.dependencies['test-package'])
        .toEqual(validManifest.dependencies['test-package']);
    });

    it('should handle uninstalling from manifest with multiple dependencies', () => {
      const manifestWithMultipleDeps: Manifest = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'package-1': { version: '1.0.0' },
          'package-2': { version: '2.0.0' },
          'package-3': { version: '3.0.0' },
        },
      };

      const packageToRemove: Package = {
        name: 'package-2',
        version: '2.0.0',
      };

      vi.mocked(mockFileSystem.readJson).mockReturnValue(manifestWithMultipleDeps);

      const result = service.uninstall({ pkg: packageToRemove });

      expect.soft(result.dependencies['package-1']).toBeDefined();
      expect.soft(result.dependencies['package-2']).toBeUndefined();
      expect.soft(result.dependencies['package-3']).toBeDefined();
      expect.soft(Object.keys(result.dependencies)).toHaveLength(2);
    });
  });

  describe('init', () => {
    it('should create default manifest with current folder name', () => {
      const folderName = 'my-godot-project';

      vi.mocked(mockFileSystem.exists).mockReturnValue(false);
      vi.mocked(mockFileSystem.currentFolderName).mockReturnValue(folderName);

      const result = service.init();

      const expectedManifest: Manifest = {
        $schema:
          'https://gist.githubusercontent.com/jv-vogler/75efaa0c79d7f52636cda333e1efc170/raw/godot-package.schema.json',
        name: folderName,
        version: '0.0.0',
        dependencies: {},
      };

      expect.soft(result).toEqual(expectedManifest);
      expect.soft(mockFileSystem.createDir).toHaveBeenCalledWith('project');
      expect
        .soft(mockFileSystem.writeFile)
        .toHaveBeenCalledWith(
          'project/godot-package.json',
          JSON.stringify(expectedManifest, null, 2),
        );
      expect.soft(mockFileSystem.writeFile).toHaveBeenCalledWith('project/.gdignore', '');
    });

    it('should create manifest with empty dependencies object', () => {
      vi.mocked(mockFileSystem.exists).mockReturnValue(false);
      vi.mocked(mockFileSystem.currentFolderName).mockReturnValue('test-project');

      const result = service.init();

      expect.soft(result.dependencies).toEqual({});
      expect.soft(typeof result.dependencies).toBe('object');
    });

    it('should use version 0.0.0 as default', () => {
      vi.mocked(mockFileSystem.exists).mockReturnValue(false);
      vi.mocked(mockFileSystem.currentFolderName).mockReturnValue('test-project');

      const result = service.init();

      expect(result.version).toBe('0.0.0');
    });

    it('should throw ManifestError when manifest already exists', () => {
      vi.mocked(mockFileSystem.exists).mockReturnValue(true);

      const initFn = () => {
        service.init();
      };

      expect.soft(initFn).toThrow(ManifestError);
      expect.soft(initFn).toThrow('project/godot-package.json already exists');
      expect.soft(mockFileSystem.writeFile).not.toHaveBeenCalled();
    });
  });
});
