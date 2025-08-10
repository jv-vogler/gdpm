import path from 'node:path';

import type { FileSystemService } from '@/services/FileSystemService';
import type { ManifestService } from '@/services/ManifestService';
import type { Package } from '@/types';

import { PackageServiceError } from './errors';

type Dependencies = {
  FileSystem: FileSystemService;
  Manifest: ManifestService;
};

const createPackageService = ({ FileSystem, Manifest }: Dependencies) => {
  const service = {
    install: ({ pkg, sourcePath }: { pkg: Package; sourcePath: string }) => {
      if (!FileSystem.exists(sourcePath)) {
        throw new PackageServiceError(`Package source path does not exist: ${sourcePath}`);
      }

      const packageSourcePath = path.join(sourcePath, 'src');

      if (!FileSystem.exists(packageSourcePath)) {
        throw new PackageServiceError(
          `Package source must contain a 'src' directory: ${packageSourcePath}`,
        );
      }

      const installPath = path.join(process.cwd(), 'godot_modules', pkg.name);

      FileSystem.copyDirectoryContents(packageSourcePath, installPath);

      const updatedManifest = Manifest.install({ pkg });

      Manifest.write(updatedManifest);
    },

    uninstall: ({ pkg }: { pkg: Package }) => {
      const installPath = path.join(process.cwd(), 'godot_modules', pkg.name);

      if (FileSystem.exists(installPath)) {
        FileSystem.removeDir(installPath);
      }

      const updatedManifest = Manifest.uninstall({ pkg });

      Manifest.write(updatedManifest);
    },
  };

  return service;
};

export { createPackageService };

type PackageService = ReturnType<typeof createPackageService>;
export type { PackageService };
