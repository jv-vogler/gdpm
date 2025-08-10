#!/usr/bin/env node
import 'dotenv/config';

import { createCli } from '@/app';

const cli = createCli();

cli.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
