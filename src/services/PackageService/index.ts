import fs from 'node:fs';
import path from 'node:path';

import type { FileSystemService } from '@/services/FileSystemService';
import type { ManifestService } from '@/services/ManifestService';
import type { Package } from '@/types';
import { createPackageTypeDetector } from '@/utils/packageType';

import { PackageServiceError } from './errors';

type Dependencies = {
  FileSystem: FileSystemService;
  Manifest: ManifestService;
};

const createPackageService = ({ FileSystem, Manifest }: Dependencies) => {
  const packageTypeDetector = createPackageTypeDetector({ FileSystem });

  const installAddon = (pkg: Package, sourcePath: string) => {
    const addonsSourcePath = path.join(sourcePath, 'addons');

    if (!FileSystem.exists(addonsSourcePath)) {
      throw new PackageServiceError(
        `Package source must contain an 'addons' directory: ${addonsSourcePath}`,
      );
    }

    const projectAddonsPath = path.join(process.cwd(), 'addons');

    if (!FileSystem.exists(projectAddonsPath)) {
      FileSystem.createDir(projectAddonsPath);
    }

    const sourceAddonPath = path.join(addonsSourcePath, pkg.name);
    const targetAddonPath = path.join(projectAddonsPath, pkg.name);

    if (FileSystem.exists(sourceAddonPath)) {
      FileSystem.copyDirectoryContents(sourceAddonPath, targetAddonPath);
    } else {
      const addonDirs = fs
        .readdirSync(addonsSourcePath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      if (addonDirs.length === 0) {
        throw new PackageServiceError(`No addon directories found in: ${addonsSourcePath}`);
      }

      for (const addonDir of addonDirs) {
        const sourceDir = path.join(addonsSourcePath, addonDir);
        const targetDir = path.join(projectAddonsPath, addonDir);

        FileSystem.copyDirectoryContents(sourceDir, targetDir);
      }
    }
  };

  const installModule = (pkg: Package, sourcePath: string) => {
    const packageSourcePath = path.join(sourcePath, 'src');

    if (!FileSystem.exists(packageSourcePath)) {
      throw new PackageServiceError(
        `Package source must contain a 'src' directory: ${packageSourcePath}`,
      );
    }

    const installPath = path.join(process.cwd(), 'godot_modules', pkg.name);

    FileSystem.copyDirectoryContents(packageSourcePath, installPath);
  };

  const service = {
    install: ({ pkg, sourcePath, key }: { pkg: Package; sourcePath: string; key?: string }) => {
      if (!FileSystem.exists(sourcePath)) {
        throw new PackageServiceError(`Package source path does not exist: ${sourcePath}`);
      }

      const packageType = packageTypeDetector.detectPackageType(pkg, sourcePath);

      if (packageType === 'addon') {
        installAddon(pkg, sourcePath);
      } else {
        installModule(pkg, sourcePath);
      }

      const updatedManifest = Manifest.install({ pkg, key });

      Manifest.write(updatedManifest);
    },

    uninstall: ({ pkg }: { pkg: Package }) => {
      const addonInstallPath = path.join(process.cwd(), 'addons', pkg.name);
      const moduleInstallPath = path.join(process.cwd(), 'godot_modules', pkg.name);

      if (FileSystem.exists(addonInstallPath)) {
        FileSystem.removeDir(addonInstallPath);
      }

      if (FileSystem.exists(moduleInstallPath)) {
        FileSystem.removeDir(moduleInstallPath);

        const godotModulesPath = path.join(process.cwd(), 'godot_modules');

        if (FileSystem.exists(godotModulesPath) && FileSystem.isEmpty(godotModulesPath)) {
          FileSystem.removeDir(godotModulesPath);
        }
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
