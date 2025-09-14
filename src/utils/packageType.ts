import path from 'node:path';

import type { FileSystemService } from '@/services/FileSystemService';
import type { Package, PackageType } from '@/types';

type PackageTypeDetectorDependencies = {
  FileSystem: FileSystemService;
};

export const createPackageTypeDetector = ({ FileSystem }: PackageTypeDetectorDependencies) => {
  /**
   * Determines the package type based on the package manifest or folder structure
   * @param pkg - The package object
   * @param sourcePath - The path to the package source
   * @returns 'addon' or 'module'
   */
  const detectPackageType = (pkg: Package, sourcePath: string): PackageType => {
    // First, check if type is explicitly defined in the package
    if (pkg.type) {
      return pkg.type;
    }

    // Fallback: Check folder structure
    const addonsPath = path.join(sourcePath, 'addons');
    const srcPath = path.join(sourcePath, 'src');

    if (FileSystem.exists(addonsPath)) {
      return 'addon';
    }

    if (FileSystem.exists(srcPath)) {
      return 'module';
    }

    // Default fallback to module for backwards compatibility
    return 'module';
  };

  return {
    detectPackageType,
  };
};

export type PackageTypeDetector = ReturnType<typeof createPackageTypeDetector>;
