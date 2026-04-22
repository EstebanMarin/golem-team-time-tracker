import { Context, Data, Effect, Layer, Schema } from 'effect';
import * as NodeFS from 'node:fs/promises';
import * as NodePath from 'node:path';
import * as NodeOs from 'node:os';

// ── Schema ────────────────────────────────────────────────────────────────────

const AppConfigSchema = Schema.Struct({
  memberId: Schema.String,
  memberName: Schema.String,
  serverUrl: Schema.String,
});

export type AppConfig = Schema.Schema.Type<typeof AppConfigSchema>;

// ── Error ─────────────────────────────────────────────────────────────────────

export class ConfigError extends Data.TaggedError('ConfigError')<{
  message: string;
}> {}

// ── Service ───────────────────────────────────────────────────────────────────

export class TtConfig extends Context.Tag('TtConfig')<TtConfig, AppConfig>() {}

export const configPath = NodePath.join(
  NodeOs.homedir(),
  '.config',
  'tt',
  'config.json',
);

export const loadConfig: Effect.Effect<AppConfig, ConfigError> = Effect.gen(
  function* () {
    const content = yield* Effect.tryPromise({
      try: () => NodeFS.readFile(configPath, 'utf-8'),
      catch: () => new ConfigError({ message: 'Config not found. Run: tt init' }),
    });
    const json = yield* Effect.try({
      try: () => JSON.parse(content) as unknown,
      catch: () => new ConfigError({ message: 'Config file is not valid JSON' }),
    });
    return yield* Schema.decodeUnknown(AppConfigSchema)(json).pipe(
      Effect.mapError(
        () => new ConfigError({ message: 'Config has invalid format. Re-run: tt init' }),
      ),
    );
  },
);

export const TtConfigLive: Layer.Layer<TtConfig, ConfigError> = Layer.effect(
  TtConfig,
  loadConfig,
);

export const saveConfig = (config: AppConfig): Effect.Effect<void, ConfigError> =>
  Effect.tryPromise({
    try: async () => {
      const dir = NodePath.dirname(configPath);
      await NodeFS.mkdir(dir, { recursive: true });
      await NodeFS.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    },
    catch: e => new ConfigError({ message: `Failed to save config: ${String(e)}` }),
  });
