import { Command } from 'commander';

import { handleApplyDefaults, handleInit, handleInstall, handleUninstall } from '@/commands';

export function createCli(): Command {
  const program = new Command();

  program.name('gdpm').description('Godot Package Manager').version('0.0.1');

  program
    .command('install [pkg]')
    .alias('i')
    .description('Install a package or all dependencies')
    .action(handleInstall);

  program.command('uninstall <pkg>').description('Uninstall a package').action(handleUninstall);

  program
    .command('init')
    .description('Initialize a gdpm manifest in the current directory')
    .option('--addon', 'Initialize as an addon package')
    .action(handleInit);

  program
    .command('gdinit')
    .description('Apply default Godot project.godot settings to the current folder')
    .action(handleApplyDefaults);

  return program;
}
