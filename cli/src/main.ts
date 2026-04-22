import { Command } from '@effect/cli';
import { FetchHttpClient } from '@effect/platform';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Effect, Layer } from 'effect';
import { TtApiLive } from './api/client.js';
import { TtConfigLive } from './config.js';
import { deleteCommand } from './commands/delete.js';
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import { logCommand } from './commands/log.js';
import { startCommand } from './commands/start.js';
import { statusCommand } from './commands/status.js';
import { stopCommand } from './commands/stop.js';
import { teamCommand } from './commands/team.js';

// ── Command tree ──────────────────────────────────────────────────────────────

const tt = Command.make('tt', {}).pipe(
  Command.withSubcommands([
    initCommand,
    startCommand,
    stopCommand,
    logCommand,
    statusCommand,
    listCommand,
    deleteCommand,
    teamCommand,
  ]),
);

// ── Layers ────────────────────────────────────────────────────────────────────

const ApiLayer = TtApiLive.pipe(
  Layer.provide(TtConfigLive),
  Layer.provide(FetchHttpClient.layer),
);

// ── Entry point ───────────────────────────────────────────────────────────────

const cli = Command.run(tt, { name: 'tt', version: '0.1.0' });

NodeRuntime.runMain(
  Effect.suspend(() => cli(process.argv)).pipe(
    Effect.provide(ApiLayer),
    Effect.provide(NodeContext.layer),
  ),
);
