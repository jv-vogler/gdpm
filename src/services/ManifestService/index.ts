import { z } from 'zod';

import type { FileSystemService } from '@/services/FileSystemService';
import { ManifestError } from '@/services/ManifestService/errors';
import { type Manifest, ManifestSchema, type Package, PackageSchema, VersionSchema } from '@/types';

const MANIFEST_FILE_NAME = 'godot-package.json';

type Dependencies = {
  FileSystem: FileSystemService;
};

const createManifestService = ({ FileSystem }: Dependencies) => {
  const service = {
    exists: (): boolean => FileSystem.exists(MANIFEST_FILE_NAME),

    read: (): Manifest => {
      const content = FileSystem.readJson(MANIFEST_FILE_NAME);
      const result = z.safeParse(ManifestSchema, content);

      if (result.error) {
        throw new ManifestError(`Invalid manifest file: ${MANIFEST_FILE_NAME}`, {
          options: {
            cause: result.error,
          },
        });
      }

      return result.data;
    },

    write: (manifest: Manifest) => {
      try {
        const content = JSON.stringify(manifest, null, 2);
        const filePath = MANIFEST_FILE_NAME;

        FileSystem.writeFile(filePath, content);
      } catch (error) {
        throw new ManifestError(`Failed to write manifest file: ${MANIFEST_FILE_NAME}`, {
          options: { cause: error },
        });
      }
    },

    findPkg: ({ manifest, name }: { manifest: Manifest; name: string }) => {
      const pkg = manifest.dependencies[name];

      if (!pkg) {
        return null;
      }

      const dependencyValueSchema = z.union([PackageSchema.omit({ name: true }), VersionSchema]);
      const parsedPkg = dependencyValueSchema.safeParse(pkg);

      if (!parsedPkg.success) {
        return null;
      }

      return parsedPkg.data;
    },

    install: ({ pkg }: { pkg: Package }): Manifest => {
      const manifest = service.read();

      manifest.dependencies[pkg.name] = pkg;

      return manifest;
    },

    uninstall: ({ pkg }: { pkg: Package }): Manifest => {
      const manifest = service.read();

      if (!manifest.dependencies[pkg.name]) {
        return manifest;
      }

      const { [pkg.name]: _removed, ...remainingDependencies } = manifest.dependencies;

      manifest.dependencies = remainingDependencies;

      return manifest;
    },

    init: (): Manifest => {
      if (service.exists()) {
        throw new ManifestError(`${MANIFEST_FILE_NAME} already exists`);
      }

      const defaultManifest: Manifest = {
        name: FileSystem.currentFolderName(),

        version: '0.0.0',
        dependencies: {},
      };

      FileSystem.writeFile(MANIFEST_FILE_NAME, JSON.stringify(defaultManifest, null, 2));

      return defaultManifest;
    },
  };

  return service;
};

export { createManifestService };

type ManifestService = ReturnType<typeof createManifestService>;
export type { ManifestService };
