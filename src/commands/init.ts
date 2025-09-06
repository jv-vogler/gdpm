import fs from 'fs';
import path from 'path';

import container from '@/container';

export function handleInit() {
  const { Manifest } = container;

  try {
    console.log('Initializing gdpm manifest...');

    const srcPath = path.resolve(process.cwd(), 'src');

    if (!fs.existsSync(srcPath)) {
      fs.mkdirSync(srcPath);
      console.log('✅ Created src directory');
    }

    if (Manifest.exists()) {
      console.log('⚠️ gdpm.json already exists');
      return;
    }

    const manifest = Manifest.init();

    console.log(`✅ Created gdpm.json for project: ${manifest.name}`);

    const gitignorePath = path.resolve(process.cwd(), '.gitignore');

    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');

      if (!gitignoreContent.split(/\r?\n/).some((line) => line.trim() === 'godot_modules')) {
        fs.appendFileSync(
          gitignorePath,
          (gitignoreContent.endsWith('\n') ? '' : '\n') + 'godot_modules\n',
        );
        console.log('✅ Added godot_modules to .gitignore');
      }
    }
  } catch (error) {
    console.error(
      `❌ Failed to initialize manifest: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
