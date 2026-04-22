import { Args, Command, Options } from '@effect/cli';
import { Console, Effect, Option } from 'effect';
import { TtApi } from '../api/client.js';

export const startCommand = Command.make(
  'start',
  {
    project: Args.text({ name: 'project' }).pipe(
      Args.withDescription('Project name'),
    ),
    description: Args.text({ name: 'description' }).pipe(
      Args.withDescription('What you are working on'),
      Args.optional,
    ),
    tags: Options.text('tag').pipe(
      Options.withDescription('Tag (can be repeated)'),
      Options.withAlias('t'),
      Options.repeated,
    ),
  },
  ({ project, description, tags }) =>
    Effect.gen(function* () {
      const api = yield* TtApi;
      const desc = Option.getOrElse(description, () => '');
      const entry = yield* api.startTimer(project, desc, tags);
      yield* Console.log(`Started timer`);
      yield* Console.log(`  project:  ${entry.project}`);
      if (entry.description) yield* Console.log(`  task:     ${entry.description}`);
      yield* Console.log(`  started:  ${formatTime(entry.startTime)}`);
      yield* Console.log(`  id:       ${entry.id}`);
    }),
);

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString();
