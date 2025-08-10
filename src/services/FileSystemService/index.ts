import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { FileSystemError } from './errors';

const TMP_DIR = path.join(os.tmpdir(), 'gdpm');

const createFileSystemService = () => ({
  currentFolderName: () => {
    return path.basename(process.cwd());
  },

  createDir: (path: string) => {
    try {
      fs.mkdirSync(path, { recursive: true });
    } catch (error) {
      throw new FileSystemError(`Failed to create directory: ${path}`, {
        options: { cause: error },
      });
    }
  },

  copyDirectoryContents: (source: string, destination: string) => {
    const tempDest = `${destination}.installing`;

    try {
      fs.mkdirSync(tempDest, { recursive: true });

      const items = fs.readdirSync(source);

      for (const item of items) {
        const sourcePath = `${source}/${item}`;
        const destPath = `${tempDest}/${item}`;

        fs.cpSync(sourcePath, destPath, { recursive: true, force: true });
      }

      if (fs.existsSync(destination)) {
        fs.rmSync(destination, { recursive: true });
      }

      fs.renameSync(tempDest, destination);
    } catch (error) {
      if (fs.existsSync(tempDest)) {
        fs.rmSync(tempDest, { recursive: true, force: true });
      }

      throw new FileSystemError(
        `Failed to copy directory contents from ${source} to ${destination}`,
        {
          options: { cause: error },
        },
      );
    }
  },

  createTmpDir: () => {
    try {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    } catch (error) {
      throw new FileSystemError('Failed to create tmp directory', { options: { cause: error } });
    }
  },

  cleanup: () => {
    try {
      if (fs.existsSync(TMP_DIR)) {
        fs.rmSync(TMP_DIR, { recursive: true, force: true });
      }
    } catch (error) {
      throw new FileSystemError('Failed to cleanup tmp directory', { options: { cause: error } });
    }
  },

  readJson: (fileName: string) => {
    if (!fileName.endsWith('.json')) {
      throw new FileSystemError(`File ${fileName} is not a JSON file`);
    }

    try {
      const content = fs.readFileSync(fileName, 'utf-8');
      const jsonContent = JSON.parse(content) as unknown;

      return jsonContent;
    } catch (error) {
      throw new FileSystemError(`Failed to read JSON file: ${fileName}`, {
        options: { cause: error },
      });
    }
  },

  exists: (fileName: string) => fs.existsSync(fileName),

  writeFile: (fileName: string, content: string) => {
    try {
      fs.writeFileSync(fileName, content, 'utf-8');
    } catch (error) {
      throw new FileSystemError(`Failed to write file: ${fileName}`, {
        options: { cause: error },
      });
    }
  },
});

export { createFileSystemService };

type FileSystemService = ReturnType<typeof createFileSystemService>;
export type { FileSystemService };
