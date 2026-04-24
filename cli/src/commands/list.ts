import { Command, Options } from '@effect/cli';
import { Console, Effect, Option } from 'effect';
import { TtApi } from '../api/client.js';
import type { TimeEntry } from '../types.js';
import { currentYearMonth, monthRange, formatDuration, dim, bold } from '../tui/render.js';

export const listCommand = Command.make(
  'list',
  {
    from: Options.text('from').pipe(
      Options.withDescription('Start date YYYY-MM-DD (default: first day of current month)'),
      Options.optional,
    ),
    to: Options.text('to').pipe(
      Options.withDescription('End date YYYY-MM-DD (default: last day of current month)'),
      Options.optional,
    ),
  },
  ({ from, to }) =>
    Effect.gen(function* () {
      const api = yield* TtApi;

      // Default to current month when no dates given
      const { year, month } = currentYearMonth();
      const { from: monthFrom, to: monthTo } = monthRange(year, month);
      const f = Option.getOrElse(from, () => monthFrom);
      const t = Option.getOrElse(to, () => monthTo);

      const entries = yield* api.getEntries(f, t);

      if (entries.length === 0) {
        yield* Console.log(`No entries found for ${f} → ${t}`);
        return;
      }

      yield* Console.log('');
      yield* Console.log(renderTable(entries));
      yield* Console.log('');

      const totalMins = entries.reduce((acc, e) => acc + (e.durationMinutes ?? 0), 0);
      yield* Console.log(
        `${bold('Total:')} ${formatDuration(totalMins)}` +
        dim(` · ${entries.length} entries · ${f} → ${t}`),
      );
      yield* Console.log('');
    }),
);

const renderTable = (entries: TimeEntry[]): string => {
  const rows = entries.map(e => [
    e.date,
    e.project.slice(0, 20),
    (e.description ?? '').slice(0, 32),
    e.durationMinutes !== null ? formatDuration(e.durationMinutes) : dim('running'),
    e.tags.join(', ').slice(0, 16),
    e.id.slice(0, 8),
  ]);

  const headers = ['Date', 'Project', 'Description', 'Duration', 'Tags', 'ID'];
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? '').length)),
  );

  const line = (cols: string[]) =>
    cols.map((c, i) => c.padEnd(widths[i] ?? 0)).join('  ');

  const separator = widths.map(w => dim('─'.repeat(w))).join('  ');

  return [line(headers.map(bold)), separator, ...rows.map(line)].join('\n');
};
