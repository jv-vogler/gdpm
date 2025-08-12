import { Command } from 'commander';

import { handleInit, handleInstall, handleUninstall } from '@/commands';

export function createCli(): Command {
  const program = new Command();

  program.name('gdpm').description('Godot Package Manager').version('0.0.1');

  program
    .command('ping')
    .description('Test command')
    .action(() => {
      console.log('pong');
    });

  program
    .command('install [pkg]')
    .alias('i')
    .description('Install a package or all dependencies')
    .action(handleInstall);

  program.command('uninstall <pkg>').description('Uninstall a package').action(handleUninstall);

  program
    .command('init')
    .description('Initialize a gdpm manifest in the current directory')
    .action(handleInit);

  return program;
}
