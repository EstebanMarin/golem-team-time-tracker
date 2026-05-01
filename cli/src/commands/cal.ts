import { Command, Options } from '@effect/cli';
import { Console, Effect, Option } from 'effect';
import { TtApi } from '../api/client.js';
import {
  buildCalLines, currentYearMonth, monthRange, parseYYYYMM, todayStr,
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

      const { from, to } = monthRange(year, mon);
      const entries = yield* api.getEntries(from, to);
      const today = todayStr();

      const minutesByDate = new Map<string, number>();
      for (const e of entries) {
        minutesByDate.set(e.date, (minutesByDate.get(e.date) ?? 0) + (e.durationMinutes ?? 0));
      }

      yield* Console.log(buildCalLines(year, mon, minutesByDate, today).join('\n'));
    }),
);
