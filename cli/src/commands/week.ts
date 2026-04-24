import { Command, Options } from '@effect/cli';
import { Console, Effect, Option } from 'effect';
import { TtApi } from '../api/client.js';
import type { TimeEntry } from '../types.js';
import {
  bold, dim, green, yellow, gray, cyan,
  formatDuration, makeBar,
  weekRange, todayStr,
  DAY_NAMES_LONG,
} from '../tui/render.js';

export const weekCommand = Command.make(
  'week',
  {
    offset: Options.integer('offset').pipe(
      Options.withDescription('Week offset: -1 = last week, 1 = next week (default: 0)'),
      Options.withDefault(0),
    ),
  },
  ({ offset }) =>
    Effect.gen(function* () {
      const api = yield* TtApi;

      const { from, to, dates } = weekRange(offset);
      const entries = yield* api.getEntries(from, to);
      const today = todayStr();

      // Group entries by date
      const byDate = new Map<string, TimeEntry[]>();
      for (const date of dates) byDate.set(date, []);
      for (const e of entries) {
        const arr = byDate.get(e.date);
        if (arr) arr.push(e);
      }

      // Compute daily totals and per-project breakdown
      type DaySummary = {
        date: string;
        totalMins: number;
        projects: Map<string, number>;
        isToday: boolean;
        isFuture: boolean;
      };

      const days: DaySummary[] = dates.map(date => {
        const dayEntries = byDate.get(date) ?? [];
        const projects = new Map<string, number>();
        let totalMins = 0;
        for (const e of dayEntries) {
          const m = e.durationMinutes ?? 0;
          totalMins += m;
          projects.set(e.project, (projects.get(e.project) ?? 0) + m);
        }
        return { date, totalMins, projects, isToday: date === today, isFuture: date > today };
      });

      const weekTotalMins = days.reduce((s, d) => s + d.totalMins, 0);
      const maxMins = Math.max(...days.map(d => d.totalMins), 480); // at least 8h scale

      // ── Header ────────────────────────────────────────────────────────────
      const weekNum = getWeekNumber(new Date(from));
      const fromLabel = formatDate(from);
      const toLabel   = formatDate(to);

      const lines: string[] = [''];
      lines.push(bold(`Week ${weekNum}`) + dim(`  ·  `) + cyan(`${fromLabel} – ${toLabel}`));
      lines.push(dim('─'.repeat(52)));

      // ── Day rows ──────────────────────────────────────────────────────────
      for (let i = 0; i < 7; i++) {
        const day = days[i]!;
        const dowName = DAY_NAMES_LONG[i]!.slice(0, 3);
        const dayNum  = day.date.split('-')[2]!;

        const label = `${dowName} ${dayNum}`.padEnd(8);
        const bar   = day.isFuture
          ? gray('░'.repeat(24))
          : makeBar(day.totalMins, maxMins, 24);
        const dur   = day.totalMins > 0
          ? green(formatDuration(day.totalMins).padStart(7))
          : gray('      —');

        const prefix = day.isToday ? bold(yellow(label)) : label;
        lines.push(`${prefix}  ${bar}  ${dur}`);

        // Project breakdown (indented)
        if (day.totalMins > 0) {
          const sorted = [...day.projects.entries()].sort((a, b) => b[1] - a[1]);
          for (const [project, mins] of sorted) {
            const pLabel = project.slice(0, 22).padEnd(22);
            lines.push(`         ${dim(pLabel)}  ${dim(formatDuration(mins))}`);
          }
        }
      }

      // ── Footer ───────────────────────────────────────────────────────────
      lines.push(dim('─'.repeat(52)));
      lines.push(
        `${'Total'.padEnd(8)}  ${' '.repeat(24)}  ${bold(green(formatDuration(weekTotalMins).padStart(7)))}`,
      );
      lines.push('');

      yield* Console.log(lines.join('\n'));
    }),
);

// ── Date utilities ────────────────────────────────────────────────────────────

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const formatDate = (dateStr: string): string => {
  const [, m, d] = dateStr.split('-');
  return `${MONTH_SHORT[parseInt(m!) - 1]} ${parseInt(d!)}`;
};

const getWeekNumber = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.ceil((diff / 86_400_000 + start.getDay() + 1) / 7);
};
