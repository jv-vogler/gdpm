import container from '@/container';
import type { Package } from '@/types';

export function handleUninstall(pkgName: string) {
  const { Manifest, Package } = container;

  try {
    console.log(`Uninstalling package: ${pkgName}`);

    if (!Manifest.exists()) {
      console.error('❌ No manifest found. Run `gdpm init` to create one.');
      process.exit(1);
    }

    const manifest = Manifest.read();

    if (!manifest.dependencies[pkgName]) {
      console.error(`❌ Package "${pkgName}" is not installed`);
      process.exit(1);
    }

    const dependencyInfo = manifest.dependencies[pkgName];

    const pkg: Package = {
      name: pkgName,
      version: typeof dependencyInfo === 'string' ? dependencyInfo : dependencyInfo.version,
      ...(typeof dependencyInfo === 'object' &&
        dependencyInfo.source && { source: dependencyInfo.source }),
    };

    Package.uninstall({ pkg });

    console.log(`✅ Successfully uninstalled ${pkgName}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`❌ Failed to uninstall package: ${errorMessage}`);
    process.exit(1);
  }
}
