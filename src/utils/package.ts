import os from 'node:os';
import path from 'node:path';

import type { FileSystemService } from '@/services/FileSystemService';

export function expandPath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }

  return filePath;
}

export function findPackagePath(
  pkgInput: string,
  sourcePath: string,
  FileSystem: FileSystemService,
): string | null {
  const directPackagePath = `${sourcePath}/project/godot-package.json`;

  if (FileSystem.exists(directPackagePath)) {
    return sourcePath;
  }

  const subfolderPackagePath = `${sourcePath}/${pkgInput}`;
  const subfolderManifestPath = `${subfolderPackagePath}/project/godot-package.json`;

  if (FileSystem.exists(subfolderManifestPath)) {
    return subfolderPackagePath;
  }

  return null;
}
