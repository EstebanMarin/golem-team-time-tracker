import { Args, Command } from '@effect/cli';
import { Console, Effect } from 'effect';
import { loadConfig, saveConfig } from '../config.js';

const projectAddCommand = Command.make(
  'add',
  { name: Args.text({ name: 'name' }) },
  ({ name }) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;
      if (config.projects.includes(name)) {
        yield* Console.error(`Project "${name}" already exists`);
        return;
      }
      yield* saveConfig({ ...config, projects: [...config.projects, name] });
      yield* Console.log(`✓ Added project: ${name}`);
    }),
);

const projectListCommand = Command.make(
  'list',
  {},
  () =>
    Effect.gen(function* () {
      const config = yield* loadConfig;
      if (config.projects.length === 0) {
        yield* Console.log('No projects. Run: tt project add <name>');
        return;
      }
      for (const p of config.projects) {
        yield* Console.log(p);
      }
    }),
);

export const projectCommand = Command.make('project', {}).pipe(
  Command.withSubcommands([projectAddCommand, projectListCommand]),
);
