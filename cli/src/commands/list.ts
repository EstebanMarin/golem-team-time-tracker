import { Command, Options } from '@effect/cli';
import { Console, Effect, Option } from 'effect';
import { TtApi } from '../api/client.js';
import type { TimeEntry } from '../types.js';

export const listCommand = Command.make(
  'list',
  {
    from: Options.text('from').pipe(
      Options.withDescription('Start date YYYY-MM-DD'),
      Options.optional,
    ),
    to: Options.text('to').pipe(
      Options.withDescription('End date YYYY-MM-DD'),
      Options.optional,
    ),
  },
  ({ from, to }) =>
    Effect.gen(function* () {
      const api = yield* TtApi;
      const f = Option.getOrUndefined(from);
      const t = Option.getOrUndefined(to);
      const entries = yield* api.getEntries(f, t);

      if (entries.length === 0) {
        yield* Console.log('No entries found');
        return;
      }

      yield* Console.log(renderTable(entries));

      const totalMins = entries.reduce((acc, e) => acc + (e.durationMinutes ?? 0), 0);
      yield* Console.log(`Total: ${formatDuration(totalMins)} across ${entries.length} entries`);
    }),
);

const renderTable = (entries: TimeEntry[]): string => {
  const rows = entries.map(e => [
    e.date,
    e.project.slice(0, 20),
    (e.description ?? '').slice(0, 30),
    e.durationMinutes !== null ? formatDuration(e.durationMinutes) : '(running)',
    e.tags.join(', '),
    e.id.slice(0, 8),
  ]);

  const headers = ['Date', 'Project', 'Description', 'Duration', 'Tags', 'ID'];
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? '').length)),
  );

  const line = (cols: string[]) =>
    cols.map((c, i) => c.padEnd(widths[i] ?? 0)).join('  ');

  const separator = widths.map(w => '-'.repeat(w)).join('  ');

  return [line(headers), separator, ...rows.map(line)].join('\n');
};

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};
