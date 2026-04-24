import { Command, Options } from '@effect/cli';
import { Console, Effect, Option } from 'effect';
import { TtApi } from '../api/client.js';
import {
  bold, cyan, green, gray, yellow, dim,
  formatCell, formatDuration,
  currentYearMonth, monthRange, parseYYYYMM,
  MONTH_NAMES, DAY_NAMES_SHORT,
  todayStr,
} from '../tui/render.js';

export const calCommand = Command.make(
  'cal',
  {
    month: Options.text('month').pipe(
      Options.withDescription('Month to view: YYYY-MM (default: current month)'),
      Options.optional,
    ),
  },
  ({ month }) =>
    Effect.gen(function* () {
      const api = yield* TtApi;

      const { year, mon } = Option.match(month, {
        onNone: () => {
          const { year, month: mon } = currentYearMonth();
          return { year, mon };
        },
        onSome: s => {
          const parsed = parseYYYYMM(s);
          if (!parsed) {
            return { year: new Date().getFullYear(), mon: new Date().getMonth() + 1 };
          }
          return { year: parsed.year, mon: parsed.month };
        },
      });

      const { from, to, daysInMonth, firstDow } = monthRange(year, mon);
      const entries = yield* api.getEntries(from, to);
      const today = todayStr();

      // Group total minutes per date
      const minutesByDate = new Map<string, number>();
      for (const e of entries) {
        minutesByDate.set(e.date, (minutesByDate.get(e.date) ?? 0) + (e.durationMinutes ?? 0));
      }

      const totalMins  = [...minutesByDate.values()].reduce((a, b) => a + b, 0);
      const trackedDays = minutesByDate.size;

      // ── Header ────────────────────────────────────────────────────────────
      const title = `${MONTH_NAMES[mon - 1]} ${year}`;
      const CELL = 6; // chars per cell (5 content + 1 space)
      const gridWidth = CELL * 7;
      const pad = Math.max(0, Math.floor((gridWidth - title.length) / 2));

      const lines: string[] = [];
      lines.push('');
      lines.push(' '.repeat(pad) + bold(cyan(title)));
      lines.push('');

      // Day headers
      const headerRow = DAY_NAMES_SHORT.map(d => dim(d.padEnd(CELL))).join('');
      lines.push(headerRow);

      // Build grid: row of 7 cells, each is [dayNum row, time row]
      const cells: Array<{ date: string; day: number; mins: number } | null> = [];

      // Leading empty cells
      for (let i = 0; i < firstDow; i++) cells.push(null);
      for (let d = 1; d <= daysInMonth; d++) {
        const date = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({ date, day: d, mins: minutesByDate.get(date) ?? 0 });
      }
      // Trailing empties to fill last row
      while (cells.length % 7 !== 0) cells.push(null);

      for (let row = 0; row < cells.length / 7; row++) {
        const slice = cells.slice(row * 7, row * 7 + 7);

        // Day numbers row
        const dayRow = slice.map(cell => {
          if (!cell) return ' '.repeat(CELL);
          const dayStr = String(cell.day).padStart(2);
          const isToday   = cell.date === today;
          const isWeekend = (row * 7 + slice.indexOf(cell)) >= 5;
          const hasMins   = cell.mins > 0;
          const isFuture  = cell.date > today;

          if (isToday)   return bold(yellow(dayStr.padEnd(CELL)));
          if (hasMins)   return green(dayStr.padEnd(CELL));
          if (isFuture)  return dim(dayStr.padEnd(CELL));
          if (isWeekend) return gray(dayStr.padEnd(CELL));
          return dayStr.padEnd(CELL);
        }).join('');

        // Time row
        const timeRow = slice.map(cell => {
          if (!cell || cell.mins === 0) return ' '.repeat(CELL);
          const label = formatCell(cell.mins).padEnd(CELL);
          return green(label);
        }).join('');

        lines.push(dayRow);
        lines.push(timeRow);
      }

      // ── Footer ───────────────────────────────────────────────────────────
      const separator = dim('─'.repeat(gridWidth));
      lines.push(separator);
      lines.push(
        `${bold('Total:')} ${green(formatDuration(totalMins))}` +
        dim(` · ${trackedDays} day${trackedDays !== 1 ? 's' : ''} tracked`),
      );
      lines.push('');

      yield* Console.log(lines.join('\n'));
    }),
);
