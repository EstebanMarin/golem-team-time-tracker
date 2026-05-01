import { Command, Options } from '@effect/cli';
import { Console, Effect } from 'effect';
import { saveConfig, configPath, ConfigError } from '../config.js';

export const registerCommand = Command.make(
  'register',
  {
    id: Options.text('id').pipe(
      Options.withDescription('Your unique team member ID (e.g. alice)'),
    ),
    name: Options.text('name').pipe(
      Options.withDescription('Your display name (e.g. "Alice Smith")'),
    ),
    server: Options.text('server').pipe(
      Options.withDescription('Golem HTTP API base URL'),
      Options.withDefault('http://backend.localhost:9006'),
    ),
  },
  ({ id, name, server }) =>
    Effect.gen(function* () {
      // Save config first so subsequent commands can use it
      yield* saveConfig({ memberId: id, memberName: name, serverUrl: server, projects: [] });

      // Register on team backend directly using the provided server URL
      // (TtApiLive is initialized at startup with the sentinel config, so we use fetch here)
      const res = yield* Effect.tryPromise({
        try: () =>
          fetch(`${server}/team/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name }),
          }),
        catch: e => new ConfigError({ message: `Network error: ${String(e)}` }),
      });

      if (!res.ok) {
        const body = yield* Effect.tryPromise({ try: () => res.text(), catch: () => '' });
        yield* Console.error(`Backend registration failed (${res.status}): ${body}`);
        return;
      }

      yield* Console.log(`✓ Registered ${name} (${id})`);
      yield* Console.log(`  Config: ${configPath}`);
      yield* Console.log(`  Server: ${server}`);
      yield* Console.log('');
      yield* Console.log('Next: tt project add <project-name>');
    }),
);
