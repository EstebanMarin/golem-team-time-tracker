import { Command } from '@effect/cli';
import { Console, Effect } from 'effect';
import { TtApi } from '../api/client.js';

export const statusCommand = Command.make('status', {}, () =>
  Effect.gen(function* () {
    const api = yield* TtApi;
    const timer = yield* api.getStatus();
    if (timer === null) {
      yield* Console.log('No timer running');
    } else {
      const elapsed = elapsedMinutes(timer.startTime);
      yield* Console.log(`Timer running`);
      yield* Console.log(`  project:  ${timer.project}`);
      if (timer.description) yield* Console.log(`  task:     ${timer.description}`);
      yield* Console.log(`  started:  ${new Date(timer.startTime).toLocaleTimeString()}`);
      yield* Console.log(`  elapsed:  ${formatDuration(elapsed)}`);
    }
  }),
);

const elapsedMinutes = (startTime: string) =>
  Math.round((Date.now() - new Date(startTime).getTime()) / 60_000);

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};
