import { Context, Data, Effect, Layer, Schema } from 'effect';
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from '@effect/platform';
import { TtConfig } from '../config.js';

// ── Errors ────────────────────────────────────────────────────────────────────

export class ApiError extends Data.TaggedError('ApiError')<{
  status: number;
  message: string;
}> {}

// ── Schemas ───────────────────────────────────────────────────────────────────

const TimeEntrySchema = Schema.Struct({
  id: Schema.String,
  project: Schema.String,
  description: Schema.String,
  startTime: Schema.String,
  endTime: Schema.NullOr(Schema.String),
  durationMinutes: Schema.NullOr(Schema.Number),
  tags: Schema.mutable(Schema.Array(Schema.String)),
  date: Schema.String,
});

const RunningTimerSchema = Schema.Struct({
  entryId: Schema.String,
  project: Schema.String,
  description: Schema.String,
  startTime: Schema.String,
});

const MemberSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  registeredAt: Schema.String,
});

const ProjectTimeSchema = Schema.Struct({
  project: Schema.String,
  minutes: Schema.Number,
});

const TeamSummaryRowSchema = Schema.Struct({
  memberId: Schema.String,
  memberName: Schema.String,
  totalMinutes: Schema.Number,
  entries: Schema.Number,
  projects: Schema.mutable(Schema.Array(ProjectTimeSchema)),
});

const GolemErrSchema = Schema.Struct({ error: Schema.String });

// ── Types (derived from schemas, always mutable for consumers) ────────────────

type TimeEntry = Schema.Schema.Type<typeof TimeEntrySchema>;
type RunningTimer = Schema.Schema.Type<typeof RunningTimerSchema>;
type Member = Schema.Schema.Type<typeof MemberSchema>;
type TeamSummaryRow = Schema.Schema.Type<typeof TeamSummaryRowSchema>;

// ── Service interface ─────────────────────────────────────────────────────────

export interface TtApiShape {
  startTimer(project: string, description: string, tags: string[]): Effect.Effect<TimeEntry, ApiError>;
  stopTimer(): Effect.Effect<TimeEntry, ApiError>;
  logTime(project: string, description: string, durationMinutes: number, date: string, tags: string[]): Effect.Effect<TimeEntry, ApiError>;
  getStatus(): Effect.Effect<RunningTimer | null, ApiError>;
  getEntries(from?: string, to?: string): Effect.Effect<TimeEntry[], ApiError>;
  deleteEntry(entryId: string): Effect.Effect<void, ApiError>;
  registerMember(id: string, name: string): Effect.Effect<Member, ApiError>;
  getMembers(): Effect.Effect<Member[], ApiError>;
  getTeamSummary(from?: string, to?: string): Effect.Effect<TeamSummaryRow[], ApiError>;
}

export class TtApi extends Context.Tag('TtApi')<TtApi, TtApiShape>() {}

// ── Helpers ───────────────────────────────────────────────────────────────────

const decodeAs =
  <A, I>(schema: Schema.Schema<A, I>) =>
  (response: HttpClientResponse.HttpClientResponse): Effect.Effect<A, ApiError> =>
    HttpClientResponse.schemaBodyJson(schema)(response).pipe(
      Effect.mapError(e => new ApiError({ status: response.status, message: String(e) })),
    );

const handleResult =
  <A, I>(schema: Schema.Schema<A, I>) =>
  (response: HttpClientResponse.HttpClientResponse): Effect.Effect<A, ApiError> => {
    if (response.status >= 200 && response.status < 300) {
      return decodeAs(schema)(response);
    }
    return decodeAs(GolemErrSchema)(response).pipe(
      Effect.flatMap(({ error }) =>
        Effect.fail(new ApiError({ status: response.status, message: error })),
      ),
      Effect.catchAll(() =>
        Effect.fail(new ApiError({ status: response.status, message: `HTTP ${response.status}` })),
      ),
    );
  };

// ── Live implementation ───────────────────────────────────────────────────────

export const TtApiLive: Layer.Layer<TtApi, never, TtConfig | HttpClient.HttpClient> =
  Layer.effect(
    TtApi,
    Effect.gen(function* () {
      const config = yield* TtConfig;
      const client = yield* HttpClient.HttpClient;
      const memberBase = `${config.serverUrl}/members/${config.memberId}`;
      const teamBase = `${config.serverUrl}/team`;

      if (!config.serverUrl) {
        return {
          startTimer: () => Effect.fail(new ApiError({ status: 0, message: 'Not configured. Run: tt init' })),
          stopTimer: () => Effect.fail(new ApiError({ status: 0, message: 'Not configured. Run: tt init' })),
          logTime: () => Effect.fail(new ApiError({ status: 0, message: 'Not configured. Run: tt init' })),
          getStatus: () => Effect.fail(new ApiError({ status: 0, message: 'Not configured. Run: tt init' })),
          getEntries: () => Effect.fail(new ApiError({ status: 0, message: 'Not configured. Run: tt init' })),
          deleteEntry: () => Effect.fail(new ApiError({ status: 0, message: 'Not configured. Run: tt init' })),
          registerMember: () => Effect.fail(new ApiError({ status: 0, message: 'Not configured. Run: tt init' })),
          getMembers: () => Effect.fail(new ApiError({ status: 0, message: 'Not configured. Run: tt init' })),
          getTeamSummary: () => Effect.fail(new ApiError({ status: 0, message: 'Not configured. Run: tt init' })),
        } satisfies TtApiShape;
      }

      const mapReqErr = Effect.mapError((e: unknown) =>
        new ApiError({ status: 0, message: String(e) }),
      );

      const post = (url: string, body: unknown) =>
        client
          .execute(
            HttpClientRequest.post(url).pipe(HttpClientRequest.bodyUnsafeJson(body)),
          )
          .pipe(mapReqErr);

      const get = (url: string) => client.get(url).pipe(mapReqErr);

      const del = (url: string) => client.del(url).pipe(mapReqErr);

      return {
        startTimer: (project, description, tags) =>
          post(`${memberBase}/start`, { project, description, tags }).pipe(
            Effect.flatMap(handleResult(TimeEntrySchema)),
          ),

        stopTimer: () =>
          post(`${memberBase}/stop`, {}).pipe(
            Effect.flatMap(handleResult(TimeEntrySchema)),
          ),

        logTime: (project, description, durationMinutes, date, tags) =>
          post(`${memberBase}/log`, { project, description, durationMinutes, date, tags }).pipe(
            Effect.flatMap(handleResult(TimeEntrySchema)),
          ),

        getStatus: () =>
          get(`${memberBase}/status`).pipe(
            Effect.flatMap(response => {
              if (response.status === 404) return Effect.succeed(null);
              return handleResult(RunningTimerSchema)(response).pipe(
                Effect.map(t => t as RunningTimer | null),
              );
            }),
          ),

        getEntries: (from, to) => {
          const params = new URLSearchParams();
          if (from) params.set('from', from);
          if (to) params.set('to', to);
          const qs = params.toString();
          const url = qs ? `${memberBase}/entries?${qs}` : `${memberBase}/entries`;
          return get(url).pipe(
            Effect.flatMap(handleResult(Schema.Array(TimeEntrySchema))),
            Effect.map(arr => [...arr]),
          );
        },

        deleteEntry: entryId =>
          del(`${memberBase}/entries/${entryId}`).pipe(
            Effect.flatMap(response =>
              response.status === 204
                ? Effect.void
                : handleResult(Schema.Void)(response),
            ),
          ),

        registerMember: (id, name) =>
          post(`${teamBase}/members`, { id, name }).pipe(
            Effect.flatMap(handleResult(MemberSchema)),
          ),

        getMembers: () =>
          get(`${teamBase}/members`).pipe(
            Effect.flatMap(handleResult(Schema.Array(MemberSchema))),
            Effect.map(arr => [...arr]),
          ),

        getTeamSummary: (from, to) => {
          const params = new URLSearchParams();
          if (from) params.set('from', from);
          if (to) params.set('to', to);
          const qs = params.toString();
          const url = qs ? `${teamBase}/summary?${qs}` : `${teamBase}/summary`;
          return get(url).pipe(
            Effect.flatMap(handleResult(Schema.Array(TeamSummaryRowSchema))),
            Effect.map(arr => [...arr]),
          );
        },
      };
    }),
  );
