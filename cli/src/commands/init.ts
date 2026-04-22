import { Args, Command, Options } from '@effect/cli';
import { Console, Effect } from 'effect';
import { saveConfig, configPath } from '../config.js';

export const initCommand = Command.make(
  'init',
  {
    memberId: Options.text('member-id').pipe(
      Options.withDescription('Your unique team member ID (e.g. alice)'),
    ),
    memberName: Options.text('member-name').pipe(
      Options.withDescription('Your display name (e.g. "Alice Smith")'),
    ),
    serverUrl: Options.text('server').pipe(
      Options.withDescription('Golem HTTP API base URL'),
      Options.withDefault('http://backend.localhost:9006'),
    ),
  },
  ({ memberId, memberName, serverUrl }) =>
    Effect.gen(function* () {
      yield* saveConfig({ memberId, memberName, serverUrl });
      yield* Console.log(`Config saved to ${configPath}`);
      yield* Console.log(`  member-id:   ${memberId}`);
      yield* Console.log(`  member-name: ${memberName}`);
      yield* Console.log(`  server:      ${serverUrl}`);
      yield* Console.log('');
      yield* Console.log(`Next: tt team register ${memberId} "${memberName}"`);
    }),
);
