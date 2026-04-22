import { Command } from '@effect/cli';
import { Console, Effect } from 'effect';
import { TtApi } from '../api/client.js';

export const stopCommand = Command.make('stop', {}, () =>
  Effect.gen(function* () {
    const api = yield* TtApi;
    const entry = yield* api.stopTimer();
    const mins = entry.durationMinutes ?? 0;
    yield* Console.log(`Stopped timer`);
    yield* Console.log(`  project:  ${entry.project}`);
    if (entry.description) yield* Console.log(`  task:     ${entry.description}`);
    yield* Console.log(`  duration: ${formatDuration(mins)}`);
    yield* Console.log(`  id:       ${entry.id}`);
  }),
);

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};
