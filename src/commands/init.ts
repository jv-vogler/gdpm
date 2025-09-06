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
  } catch (error) {
    console.error(
      `❌ Failed to initialize manifest: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
