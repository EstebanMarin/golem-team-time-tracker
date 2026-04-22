import { Args, Command, Options } from '@effect/cli';
import { Console, Data, Effect, Option } from 'effect';
import { TtApi } from '../api/client.js';

class ParseError extends Data.TaggedError('ParseError')<{ message: string }> {}

/** Parse duration strings: 90m, 1h, 1h30m, 1.5h */
const parseDuration = (s: string): Effect.Effect<number, ParseError> => {
  const m = /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m)?$/.exec(s.trim());
  if (!m || (!m[1] && !m[2])) {
    return Effect.fail(
      new ParseError({ message: `Invalid duration '${s}'. Use: 90m, 1h, 1h30m, 1.5h` }),
    );
  }
  const hours = parseFloat(m[1] ?? '0');
  const minutes = parseInt(m[2] ?? '0', 10);
  const total = Math.round(hours * 60 + minutes);
  if (total <= 0) {
    return Effect.fail(new ParseError({ message: 'Duration must be greater than zero' }));
  }
  return Effect.succeed(total);
};

export const logCommand = Command.make(
  'log',
  {
    project: Args.text({ name: 'project' }).pipe(Args.withDescription('Project name')),
    duration: Args.text({ name: 'duration' }).pipe(
      Args.withDescription('Duration: 90m | 1h | 1h30m | 1.5h'),
    ),
    description: Args.text({ name: 'description' }).pipe(
      Args.withDescription('What you worked on'),
      Args.optional,
    ),
    date: Options.text('date').pipe(
      Options.withDescription('Date YYYY-MM-DD (default: today)'),
      Options.optional,
    ),
    tags: Options.text('tag').pipe(
      Options.withDescription('Tag (can be repeated)'),
      Options.withAlias('t'),
      Options.repeated,
    ),
  },
  ({ project, duration, description, date, tags }) =>
    Effect.gen(function* () {
      const api = yield* TtApi;
      const mins = yield* parseDuration(duration);
      const desc = Option.getOrElse(description, () => '');
      const d = Option.getOrElse(date, () => todayDate());
      const entry = yield* api.logTime(project, desc, mins, d, tags);
      yield* Console.log(`Logged time`);
      yield* Console.log(`  project:  ${entry.project}`);
      if (entry.description) yield* Console.log(`  task:     ${entry.description}`);
      yield* Console.log(`  date:     ${entry.date}`);
      yield* Console.log(`  duration: ${formatDuration(mins)}`);
      yield* Console.log(`  id:       ${entry.id}`);
    }),
);

const todayDate = () => new Date().toISOString().split('T')[0]!;

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};
