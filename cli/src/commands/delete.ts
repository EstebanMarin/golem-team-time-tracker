import { Args, Command } from '@effect/cli';
import { Console, Effect } from 'effect';
import { TtApi } from '../api/client.js';

export const deleteCommand = Command.make(
  'delete',
  {
    entryId: Args.text({ name: 'entryId' }).pipe(
      Args.withDescription('Entry ID to delete (from tt list)'),
    ),
  },
  ({ entryId }) =>
    Effect.gen(function* () {
      const api = yield* TtApi;
      yield* api.deleteEntry(entryId);
      yield* Console.log(`Deleted entry ${entryId}`);
    }),
);
