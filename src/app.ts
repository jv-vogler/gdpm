import { Command } from 'commander';
import os from 'node:os';
import path from 'node:path';

import container from '@/container';
import type { FileSystemService } from '@/services/FileSystemService';
import type { Package } from '@/types';

function expandPath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }

  return filePath;
}

function findPackagePath(
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

function handleInstall(pkgInput: string) {
  const { FileSystem, Manifest, Package } = container;

  try {
    console.log(`Installing package: ${pkgInput}`);

    const manifest = Manifest.read();
    const rawSourcePath = manifest.defaultSource ?? '.';
    const sourcePath = expandPath(rawSourcePath);

    const packagePath = findPackagePath(pkgInput, sourcePath, FileSystem);

    if (!packagePath) {
      throw new Error(
        `Package "${pkgInput}" not found. Expected project/godot-package.json in "${sourcePath}" or "${sourcePath}/${pkgInput}"`,
      );
    }

    const packageManifestPath = `${packagePath}/project/godot-package.json`;
    const packageManifest = FileSystem.readJson(packageManifestPath) as Package;

    const pkg: Package = {
      name: packageManifest.name || pkgInput,
      version: packageManifest.version || '1.0.0',
      source: packageManifest.source,
    };

    Package.install({ pkg, sourcePath: packagePath });

    console.log(`✅ Successfully installed ${pkg.name}@${pkg.version}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`❌ Failed to install package: ${errorMessage}`);
    process.exit(1);
  }
}

function handleUninstall(_pkgName: string) {
  // TODO
}

function handleInit() {
  const { Manifest } = container;

  try {
    console.log('Initializing gdpm manifest...');

    if (Manifest.exists()) {
      console.log('⚠️ gdpm.json already exists');
      return;
    }

    const manifest = Manifest.init();

    console.log(`✅ Created gdpm.json for project: ${manifest.name}`);
  } catch (error) {
    console.error(
      `❌ Failed to initialize manifest: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

export function createCli(): Command {
  const program = new Command();

  program.name('gdpm').description('Godot Package Manager').version('0.0.1');

  program
    .command('ping')
    .description('Test command')
    .action(() => {
      console.log('pong');
    });

  program.command('install <pkg>').description('Install a package').action(handleInstall);

  program.command('uninstall <pkg>').description('Uninstall a package').action(handleUninstall);

  program
    .command('init')
    .description('Initialize a gdpm manifest in the current directory')
    .action(handleInit);

  return program;
}
