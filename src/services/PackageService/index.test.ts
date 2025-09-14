import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FileSystemService } from '@/services/FileSystemService';
import type { ManifestService } from '@/services/ManifestService';
import { PackageServiceError } from '@/services/PackageService/errors';
import { createPackageService } from '@/services/PackageService/index';
import type { Manifest, Package } from '@/types';

describe('PackageService', () => {
  let mockFileSystem: FileSystemService;
  let mockManifestService: ManifestService;
  let service: ReturnType<typeof createPackageService>;

  const testPackage: Package = {
    name: 'test-package',
    version: '1.0.0',
    source: 'https://github.com/test/package.git',
  };

  const testManifest: Manifest = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      'existing-package': {
        version: '2.0.0',
      },
    },
  };

  beforeEach(() => {
    mockFileSystem = {
      exists: vi.fn(),
      isEmpty: vi.fn(),
      copyDirectoryContents: vi.fn(),
      removeDir: vi.fn(),
      createDir: vi.fn(),
    } as unknown as FileSystemService;

    mockManifestService = {
      install: vi.fn(),
      uninstall: vi.fn(),
      write: vi.fn(),
    } as unknown as ManifestService;

    service = createPackageService({
      FileSystem: mockFileSystem,
      Manifest: mockManifestService,
    });

    // Mock process.cwd()
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/project/path');
  });

  describe('install', () => {
    const sourcePath = '/tmp/package-source';

    const mockModuleInstallation = () => {
      const existsMock = vi.mocked(mockFileSystem.exists);

      existsMock.mockImplementation((filePath) => {
        if (filePath === sourcePath) return true;

        if (filePath === path.join(sourcePath, 'addons')) return false;

        if (filePath === path.join(sourcePath, 'src')) return true;

        return false;
      });
    };

    const mockAddonInstallation = () => {
      const existsMock = vi.mocked(mockFileSystem.exists);

      existsMock.mockImplementation((filePath) => {
        if (filePath === sourcePath) return true;

        if (filePath === path.join(sourcePath, 'addons')) return true;

        if (filePath === path.join(sourcePath, 'addons', 'test-package')) return true;

        if (filePath === path.join('/mock/project/path', 'addons')) return false;

        return false;
      });
    };

    it('installs package successfully as module when src directory exists', () => {
      const packageSourcePath = path.join(sourcePath, 'src');
      const expectedInstallPath = path.join(
        '/mock/project/path',
        'godot_modules',
        testPackage.name,
      );

      const updatedManifest: Manifest = {
        ...testManifest,
        dependencies: {
          ...testManifest.dependencies,
          [testPackage.name]: testPackage,
        },
      };

      mockModuleInstallation();

      vi.mocked(mockManifestService.install).mockReturnValue(updatedManifest);

      service.install({ pkg: testPackage, sourcePath });

      expect.soft(mockFileSystem.exists).toHaveBeenCalledWith(sourcePath);
      expect.soft(mockFileSystem.exists).toHaveBeenCalledWith(path.join(sourcePath, 'addons'));
      expect.soft(mockFileSystem.exists).toHaveBeenCalledWith(packageSourcePath);
      expect
        .soft(mockFileSystem.copyDirectoryContents)
        .toHaveBeenCalledWith(packageSourcePath, expectedInstallPath);
      expect.soft(mockManifestService.install).toHaveBeenCalledWith({ pkg: testPackage });
      expect.soft(mockManifestService.write).toHaveBeenCalledWith(updatedManifest);
    });

    it('installs package successfully as addon when addons directory exists', () => {
      const addonsSourcePath = path.join(sourcePath, 'addons');
      const expectedInstallPath = path.join('/mock/project/path', 'addons');

      const addonPackage: Package = {
        ...testPackage,
        type: 'addon',
      };

      const updatedManifest: Manifest = {
        ...testManifest,
        dependencies: {
          ...testManifest.dependencies,
          [addonPackage.name]: addonPackage,
        },
      };

      mockAddonInstallation();

      vi.mocked(mockManifestService.install).mockReturnValue(updatedManifest);

      service.install({ pkg: addonPackage, sourcePath });

      const sourceAddonPath = path.join(addonsSourcePath, 'test-package');
      const targetAddonPath = path.join(expectedInstallPath, 'test-package');

      expect.soft(mockFileSystem.exists).toHaveBeenCalledWith(sourcePath);
      expect.soft(mockFileSystem.exists).toHaveBeenCalledWith(addonsSourcePath);
      expect.soft(mockFileSystem.exists).toHaveBeenCalledWith(sourceAddonPath);
      expect.soft(mockFileSystem.createDir).toHaveBeenCalledWith(expectedInstallPath);
      expect
        .soft(mockFileSystem.copyDirectoryContents)
        .toHaveBeenCalledWith(sourceAddonPath, targetAddonPath);
      expect.soft(mockManifestService.install).toHaveBeenCalledWith({ pkg: addonPackage });
      expect.soft(mockManifestService.write).toHaveBeenCalledWith(updatedManifest);
    });

    it('throws PackageServiceError when source path does not exist', () => {
      vi.mocked(mockFileSystem.exists).mockReturnValue(false);

      const installFn = () => {
        service.install({ pkg: testPackage, sourcePath });
      };

      expect.soft(installFn).toThrow(PackageServiceError);
      expect.soft(installFn).toThrow(`Package source path does not exist: ${sourcePath}`);
      expect.soft(mockFileSystem.copyDirectoryContents).not.toHaveBeenCalled();
      expect.soft(mockManifestService.install).not.toHaveBeenCalled();
      expect.soft(mockManifestService.write).not.toHaveBeenCalled();
    });

    it('throws PackageServiceError when src directory does not exist', () => {
      const packageSourcePath = path.join(sourcePath, 'src');
      const existsMock = vi.mocked(mockFileSystem.exists);

      existsMock.mockImplementation((filePath: string) => {
        if (filePath === sourcePath) return true;

        if (filePath === path.join(sourcePath, 'addons')) return false;

        if (filePath === packageSourcePath) return false;

        return false;
      });

      const installFn = () => {
        service.install({ pkg: testPackage, sourcePath });
      };

      expect.soft(installFn).toThrow(PackageServiceError);
      expect
        .soft(installFn)
        .toThrow(`Package source must contain a 'src' directory: ${packageSourcePath}`);
      expect.soft(mockFileSystem.copyDirectoryContents).not.toHaveBeenCalled();
      expect.soft(mockManifestService.install).not.toHaveBeenCalled();
      expect.soft(mockManifestService.write).not.toHaveBeenCalled();
    });

    it('creates correct install path using package name', () => {
      const packageWithDifferentName: Package = {
        name: 'different-package-name',
        version: '1.0.0',
      };

      const packageSourcePath = path.join(sourcePath, 'src');
      const existsMock = vi.mocked(mockFileSystem.exists);

      existsMock.mockImplementation((filePath: string) => {
        if (filePath === sourcePath) return true;

        if (filePath === path.join(sourcePath, 'addons')) return false;

        if (filePath === packageSourcePath) return true;

        return false;
      });

      vi.mocked(mockManifestService.install).mockReturnValue(testManifest);

      service.install({ pkg: packageWithDifferentName, sourcePath });

      const expectedDifferentInstallPath = path.join(
        '/mock/project/path',
        'godot_modules',
        'different-package-name',
      );

      expect(mockFileSystem.copyDirectoryContents).toHaveBeenCalledWith(
        packageSourcePath,
        expectedDifferentInstallPath,
      );
    });

    it('handles file system errors during copy', () => {
      vi.mocked(mockFileSystem.exists).mockReturnValue(true);
      vi.mocked(mockFileSystem.copyDirectoryContents).mockImplementation(() => {
        throw new Error('Copy failed');
      });

      const installFn = () => {
        service.install({ pkg: testPackage, sourcePath });
      };

      expect.soft(installFn).toThrow('Copy failed');
      expect.soft(mockManifestService.install).not.toHaveBeenCalled();
      expect.soft(mockManifestService.write).not.toHaveBeenCalled();
    });
  });

  describe('uninstall', () => {
    const expectedInstallPath = path.join('/mock/project/path', 'godot_modules', testPackage.name);

    it('uninstalls package successfully when installed', () => {
      const existingDep = testManifest.dependencies['existing-package'];
      const updatedManifest: Manifest = {
        ...testManifest,
        dependencies: existingDep ? { 'existing-package': existingDep } : {},
      };

      vi.mocked(mockFileSystem.exists).mockReturnValue(true);
      vi.mocked(mockFileSystem.isEmpty).mockReturnValue(false); // godot_modules not empty
      vi.mocked(mockManifestService.uninstall).mockReturnValue(updatedManifest);

      service.uninstall({ pkg: testPackage });

      expect.soft(mockFileSystem.exists).toHaveBeenCalledWith(expectedInstallPath);
      expect.soft(mockFileSystem.removeDir).toHaveBeenCalledWith(expectedInstallPath);
      expect.soft(mockFileSystem.exists).toHaveBeenCalledWith('/mock/project/path/godot_modules');
      expect.soft(mockFileSystem.isEmpty).toHaveBeenCalledWith('/mock/project/path/godot_modules');
      expect.soft(mockManifestService.uninstall).toHaveBeenCalledWith({ pkg: testPackage });
      expect.soft(mockManifestService.write).toHaveBeenCalledWith(updatedManifest);
    });

    it('uninstalls package successfully when not physically installed', () => {
      const addonInstallPath = path.join('/mock/project/path', 'addons', testPackage.name);
      const moduleInstallPath = path.join('/mock/project/path', 'godot_modules', testPackage.name);

      const existingDep = testManifest.dependencies['existing-package'];
      const updatedManifest: Manifest = {
        ...testManifest,
        dependencies: existingDep ? { 'existing-package': existingDep } : {},
      };

      const existsMock = vi.mocked(mockFileSystem.exists);

      existsMock.mockImplementation((filePath: string) => {
        if (filePath === addonInstallPath) return false;

        if (filePath === moduleInstallPath) return false;

        return false;
      });

      vi.mocked(mockManifestService.uninstall).mockReturnValue(updatedManifest);

      service.uninstall({ pkg: testPackage });

      expect.soft(mockFileSystem.exists).toHaveBeenCalledWith(addonInstallPath);
      expect.soft(mockFileSystem.exists).toHaveBeenCalledWith(moduleInstallPath);
      expect.soft(mockFileSystem.removeDir).not.toHaveBeenCalled();
      expect.soft(mockManifestService.uninstall).toHaveBeenCalledWith({ pkg: testPackage });
      expect.soft(mockManifestService.write).toHaveBeenCalledWith(updatedManifest);
    });

    it('creates correct uninstall path using package name', () => {
      const packageWithDifferentName: Package = {
        name: 'another-package-name',
        version: '1.0.0',
      };

      vi.mocked(mockFileSystem.exists).mockReturnValue(true);
      vi.mocked(mockFileSystem.isEmpty).mockReturnValue(false);
      vi.mocked(mockManifestService.uninstall).mockReturnValue(testManifest);

      service.uninstall({ pkg: packageWithDifferentName });

      const expectedDifferentInstallPath = path.join(
        '/mock/project/path',
        'godot_modules',
        'another-package-name',
      );

      expect.soft(mockFileSystem.exists).toHaveBeenCalledWith(expectedDifferentInstallPath);
      expect.soft(mockFileSystem.removeDir).toHaveBeenCalledWith(expectedDifferentInstallPath);
    });

    it('removes godot_modules directory when empty after uninstall', () => {
      vi.mocked(mockFileSystem.exists).mockReturnValue(true);
      vi.mocked(mockFileSystem.isEmpty).mockReturnValue(true); // godot_modules is empty
      vi.mocked(mockManifestService.uninstall).mockReturnValue(testManifest);

      service.uninstall({ pkg: testPackage });

      expect.soft(mockFileSystem.removeDir).toHaveBeenCalledWith(expectedInstallPath);
      expect
        .soft(mockFileSystem.removeDir)
        .toHaveBeenCalledWith('/mock/project/path/godot_modules');
    });

    it('handles file system errors during removal', () => {
      vi.mocked(mockFileSystem.exists).mockReturnValue(true);
      vi.mocked(mockFileSystem.removeDir).mockImplementation(() => {
        throw new Error('Remove failed');
      });

      const uninstallFn = () => {
        service.uninstall({ pkg: testPackage });
      };

      expect.soft(uninstallFn).toThrow('Remove failed');
      expect.soft(mockManifestService.uninstall).not.toHaveBeenCalled();
      expect.soft(mockManifestService.write).not.toHaveBeenCalled();
    });

    it('handles manifest errors during uninstall', () => {
      vi.mocked(mockFileSystem.exists).mockReturnValue(true);
      vi.mocked(mockFileSystem.isEmpty).mockReturnValue(false);
      vi.mocked(mockManifestService.uninstall).mockImplementation(() => {
        throw new Error('Manifest update failed');
      });

      const uninstallFn = () => {
        service.uninstall({ pkg: testPackage });
      };

      expect.soft(uninstallFn).toThrow('Manifest update failed');
      expect.soft(mockFileSystem.removeDir).toHaveBeenCalled();
      expect.soft(mockManifestService.write).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles manifest write errors during install', () => {
      vi.mocked(mockFileSystem.exists).mockReturnValue(true);
      vi.mocked(mockManifestService.install).mockReturnValue(testManifest);
      vi.mocked(mockManifestService.write).mockImplementation(() => {
        throw new Error('Write failed');
      });

      const installFn = () => {
        service.install({ pkg: testPackage, sourcePath: '/tmp/source' });
      };

      expect.soft(installFn).toThrow('Write failed');
      expect.soft(mockFileSystem.copyDirectoryContents).toHaveBeenCalled();
      expect.soft(mockManifestService.install).toHaveBeenCalled();
    });

    it('handles manifest write errors during uninstall', () => {
      vi.mocked(mockFileSystem.exists).mockReturnValue(true);
      vi.mocked(mockFileSystem.isEmpty).mockReturnValue(false);
      vi.mocked(mockManifestService.uninstall).mockReturnValue(testManifest);
      vi.mocked(mockManifestService.write).mockImplementation(() => {
        throw new Error('Write failed');
      });

      const uninstallFn = () => {
        service.uninstall({ pkg: testPackage });
      };

      expect.soft(uninstallFn).toThrow('Write failed');
      expect.soft(mockFileSystem.removeDir).toHaveBeenCalled();
      expect.soft(mockManifestService.uninstall).toHaveBeenCalled();
    });
  });
});
