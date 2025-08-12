import container from '@/container';
import type { Package } from '@/types';
import { expandPath, findPackagePath } from '@/utils/package';

function installDependencies(dependencies: string[]) {
  let installed = 0;
  let failed = 0;

  for (const pkgName of dependencies) {
    try {
      console.log(`\nInstalling ${pkgName}...`);
      handleInstallSingle(pkgName);
      installed++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      console.error(`❌ Failed to install ${pkgName}: ${errorMsg}`);
      failed++;
    }
  }

  console.log(
    `\n📦 Installation complete: ${installed.toString()} installed, ${failed.toString()} failed`,
  );

  if (failed > 0) {
    process.exit(1);
  }
}

function handleInstallAll() {
  const { Manifest } = container;

  try {
    console.log('Installing all dependencies...');

    const manifest = Manifest.read();
    const dependencies = Object.keys(manifest.dependencies);

    if (dependencies.length === 0) {
      console.log('⚠️ No dependencies found in manifest');
      return;
    }

    console.log(`Found ${dependencies.length.toString()} dependencies to install:`);
    dependencies.forEach((dep) => {
      console.log(`  - ${dep}`);
    });

    installDependencies(dependencies);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`❌ Failed to read dependencies: ${errorMessage}`);
    process.exit(1);
  }
}

function handleInstallSingle(pkgInput: string) {
  const { FileSystem, Manifest, Package } = container;

  try {
    console.log(`Installing package: ${pkgInput}`);

    if (!Manifest.exists()) {
      console.log('No manifest found. Initializing...');
      Manifest.init();
    }

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

    Package.install({ pkg, sourcePath: packagePath, key: pkgInput });

    console.log(`✅ Successfully installed ${pkg.name}@${pkg.version}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`❌ Failed to install package: ${errorMessage}`);
    process.exit(1);
  }
}

export function handleInstall(pkgInput?: string) {
  if (!pkgInput) {
    handleInstallAll();
    return;
  }

  handleInstallSingle(pkgInput);
}
