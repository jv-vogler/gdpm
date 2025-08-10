import { Command } from 'commander';

export function createCli(): Command {
  const program = new Command();

  program.name('gdpm').description('Godot Package Manager').version('0.0.1');

  program
    .command('ping')
    .description('Test command')
    .action(() => {
      console.log('pong');
    });

  return program;
}
