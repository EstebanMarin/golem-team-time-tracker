import { Args, Command, Options } from '@effect/cli';
import { Console, Effect, Option } from 'effect';
import { TtApi } from '../api/client.js';
import type { TeamSummaryRow } from '../types.js';

const registerCommand = Command.make(
  'register',
  {
    id: Args.text({ name: 'id' }).pipe(Args.withDescription('Member ID')),
    name: Args.text({ name: 'name' }).pipe(Args.withDescription('Display name')),
  },
  ({ id, name }) =>
    Effect.gen(function* () {
      const api = yield* TtApi;
      const member = yield* api.registerMember(id, name);
      yield* Console.log(`Registered member`);
      yield* Console.log(`  id:   ${member.id}`);
      yield* Console.log(`  name: ${member.name}`);
    }),
);

const membersCommand = Command.make('members', {}, () =>
  Effect.gen(function* () {
    const api = yield* TtApi;
    const members = yield* api.getMembers();
    if (members.length === 0) {
      yield* Console.log('No members registered. Use: tt team register <id> <name>');
      return;
    }
    for (const m of members) {
      yield* Console.log(`  ${m.id.padEnd(20)} ${m.name}`);
    }
  }),
);

const summaryCommand = Command.make(
  'summary',
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
      const rows = yield* api.getTeamSummary(f, t);

      if (rows.length === 0) {
        yield* Console.log('No data');
        return;
      }

      yield* Console.log(renderSummary(rows));
    }),
);

export const teamCommand = Command.make('team', {}).pipe(
  Command.withSubcommands([registerCommand, membersCommand, summaryCommand]),
);

const renderSummary = (rows: TeamSummaryRow[]): string => {
  const lines: string[] = ['Team Summary', ''];
  for (const row of rows) {
    lines.push(`${row.memberName} (${row.memberId})`);
    lines.push(`  Total: ${formatDuration(row.totalMinutes)}  |  Entries: ${row.entries}`);
    for (const { project, minutes: mins } of row.projects) {
      lines.push(`    ${project.padEnd(25)} ${formatDuration(mins)}`);
    }
    lines.push('');
  }
  return lines.join('\n');
};

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};
