import fs from 'fs';
import path from 'path';

import container from '@/container';
import type { PackageType } from '@/types';

function createDirectories() {
  // Create both src and addons directories if they don't exist
  const srcPath = path.resolve(process.cwd(), 'src');
  const addonsPath = path.resolve(process.cwd(), 'addons');
  const godotModulesPath = path.resolve(process.cwd(), 'godot_modules');

  [srcPath, addonsPath, godotModulesPath].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created ${path.basename(dir)} directory`);
    }
  });
}

function updateGitignore() {
  const gitignorePath = path.resolve(process.cwd(), '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return;
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  const ignoreEntries = ['godot_modules', 'addons'];
  const existingLines = gitignoreContent.split(/\r?\n/).map((line) => line.trim());
  let hasChanges = false;

  ignoreEntries.forEach((entry) => {
    if (!existingLines.includes(entry)) {
      fs.appendFileSync(
        gitignorePath,
        (gitignoreContent.endsWith('\n') ? '' : '\n') + entry + '\n',
      );
      console.log(`✅ Added ${entry} to .gitignore`);
      hasChanges = true;
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!hasChanges) {
    console.log('ℹ️ .gitignore already contains godot_modules and addons');
  }
}

export function handleInit(options: { addon?: boolean } = {}) {
  const { Manifest } = container;

  try {
    console.log('Initializing gdpm manifest...');

    createDirectories();

    if (Manifest.exists()) {
      console.log('⚠️ gdpm.json already exists');
      return;
    }

    // eslint-disable-next-line no-undefined
    const packageType: PackageType | undefined = options.addon ? 'addon' : undefined;
    const manifest = Manifest.init(packageType);

    console.log(`✅ Created gdpm.json for project: ${manifest.name}`);

    updateGitignore();
  } catch (error) {
    console.error(
      `❌ Failed to initialize manifest: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
