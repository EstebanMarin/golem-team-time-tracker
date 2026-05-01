import { Command, Options } from '@effect/cli';
import { Console, Effect, Option } from 'effect';
import { TtApi } from '../api/client.js';
import type { TimeEntry } from '../types.js';
import {
  currentYearMonth, monthRange, formatDuration, buildCalLines, todayStr,
  dim, bold, green,
} from '../tui/render.js';

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
    monthly: Options.boolean('monthly').pipe(
      Options.withDescription('Show calendar grid view'),
    ),
    daily: Options.boolean('daily').pipe(
      Options.withDescription('Show entries grouped by day'),
    ),
  },
  ({ from, to, monthly, daily }) =>
    Effect.gen(function* () {
      const api = yield* TtApi;

      const { year, month } = currentYearMonth();
      const { from: monthFrom, to: monthTo } = monthRange(year, month);
      const f = Option.getOrElse(from, () => monthFrom);
      const t = Option.getOrElse(to, () => monthTo);

      const entries = yield* api.getEntries(f, t);

      if (entries.length === 0) {
        yield* Console.log(`No entries found for ${f} → ${t}`);
        return;
      }

      if (monthly) {
        const minutesByDate = new Map<string, number>();
        for (const e of entries) {
          minutesByDate.set(e.date, (minutesByDate.get(e.date) ?? 0) + (e.durationMinutes ?? 0));
        }
        yield* Console.log(buildCalLines(year, month, minutesByDate, todayStr()).join('\n'));
        return;
      }

      if (daily) {
        yield* Console.log('');
        const byDate = new Map<string, TimeEntry[]>();
        for (const e of entries) {
          const list = byDate.get(e.date) ?? [];
          list.push(e);
          byDate.set(e.date, list);
        }
        const sortedDates = [...byDate.keys()].sort();
        for (const date of sortedDates) {
          const dayEntries = byDate.get(date)!;
          const dayMins = dayEntries.reduce((acc, e) => acc + (e.durationMinutes ?? 0), 0);
          yield* Console.log(`${bold(date)}  ${green(formatDuration(dayMins))}`);
          for (const e of dayEntries) {
            const dur = e.durationMinutes !== null ? formatDuration(e.durationMinutes) : dim('running');
            yield* Console.log(`  ${e.project.padEnd(20)} ${dur.padStart(8)}  ${dim(e.description ?? '')}`);
          }
          yield* Console.log('');
        }
        const totalMins = entries.reduce((acc, e) => acc + (e.durationMinutes ?? 0), 0);
        yield* Console.log(`${bold('Total:')} ${formatDuration(totalMins)}` + dim(` · ${entries.length} entries`));
        yield* Console.log('');
        return;
      }

      // Default: table view
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
