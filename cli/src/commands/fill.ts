import { Command, Options } from '@effect/cli';
import { Console, Effect, Option } from 'effect';
import { TtApi } from '../api/client.js';
import {
  weekRange, monthRange, parseYYYYMM, currentYearMonth, formatDuration,
  green, bold, dim,
} from '../tui/render.js';

const workingDaysInMonth = (year: number, month: number): string[] => {
  const { daysInMonth } = monthRange(year, month);
  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = new Date(date).getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) dates.push(date);
  }
  return dates;
};

export const fillCommand = Command.make(
  'fill',
  {
    month: Options.text('month').pipe(
      Options.withDescription('Month to fill: YYYY-MM (default: current month)'),
      Options.optional,
    ),
    week: Options.boolean('week').pipe(
      Options.withDescription('Fill current week (Mon–Fri) instead of a month'),
    ),
    project: Options.text('project').pipe(
      Options.withDescription('Project name to log against'),
    ),
    hours: Options.text('hours').pipe(
      Options.withDescription('Hours per working day (e.g. 8)'),
    ),
  },
  ({ month, week, project, hours }) =>
    Effect.gen(function* () {
      const api = yield* TtApi;

      const hoursNum = parseInt(hours, 10);
      if (isNaN(hoursNum) || hoursNum <= 0) {
        yield* Console.error('--hours must be a positive integer');
        return;
      }
      const durationMinutes = hoursNum * 60;

      let dates: string[];
      if (week) {
        const { dates: weekDates } = weekRange(0);
        dates = weekDates.slice(0, 5); // Mon–Fri only
      } else if (Option.isSome(month)) {
        const parsed = parseYYYYMM(Option.getOrThrow(month));
        if (!parsed) {
          yield* Console.error('Invalid month format. Use YYYY-MM');
          return;
        }
        dates = workingDaysInMonth(parsed.year, parsed.month);
      } else {
        const { year, month: mon } = currentYearMonth();
        dates = workingDaysInMonth(year, mon);
      }

      yield* Console.log('');
      for (const date of dates) {
        yield* api.logTime(project, '', durationMinutes, date, []);
        yield* Console.log(`  ${green('✓')} ${date}  ${project}  ${dim(`${hoursNum}h`)}`);
      }

      yield* Console.log('');
      yield* Console.log(
        `${bold('Logged')} ${green(formatDuration(dates.length * durationMinutes))} ` +
        dim(`across ${dates.length} days`),
      );
      yield* Console.log('');
    }),
);
