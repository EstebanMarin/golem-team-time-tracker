# Golem Team Time Tracker

A Toggl-like team time tracker built on [Golem](https://golem.cloud) + [Effect](https://effect.website).

- **No database** — state lives in Golem's durable oplog
- **Backend** — TypeScript Golem workers (compiled to WASM)
- **CLI** — TypeScript + Effect, downloaded by each team member

## Architecture

```
backend/   Golem WASM workers
  MemberAgent("alice")   per-member durable agent (time entries, running timer)
  TeamAgent              singleton registry + aggregate reports

cli/       Effect TypeScript CLI
  tt init / start / stop / log / status / list / delete / team
```

## Prerequisites

Enter the Nix dev shell — it provides `golem` 1.5, Node.js 24, and npm:

```bash
nix develop
```

## Running the backend

All `golem` commands must be run from the `backend/` directory.

```bash
cd backend

# Terminal 1 — start the local Golem server
golem server run

# Terminal 2 — build and deploy
golem build
golem deploy
```

To redeploy after code changes:

```bash
golem build && golem deploy --reset
```

> `--reset` deletes existing agent instances so they pick up the new component version.
> Omit it to keep existing state and let running agents update on next invocation.

## CLI setup

```bash
cd cli
npm install

# First-time setup — writes ~/.config/tt/config.json
npx tsx src/main.ts init \
  --member-id alice \
  --member-name "Alice Smith" \
  --server http://backend.localhost:9006

# Register yourself on the team (once per member, run by anyone)
npx tsx src/main.ts team register alice "Alice Smith"
```

## Daily usage

```bash
# Start tracking
npx tsx src/main.ts start "my-project" "fixing the login bug"

# Check what's running
npx tsx src/main.ts status

# Stop the timer
npx tsx src/main.ts stop

# Log time manually (supports: 90m, 1h, 1h30m, 1.5h)
npx tsx src/main.ts log "my-project" "2h" "code review" --date 2026-04-21

# List entries (optional date range)
npx tsx src/main.ts list --from 2026-04-01 --to 2026-04-30

# Delete an entry (ID from tt list)
npx tsx src/main.ts delete <entryId>
```

## Team commands

```bash
# List all registered members
npx tsx src/main.ts team members

# Team summary (total hours per person per project)
npx tsx src/main.ts team summary --from 2026-04-01 --to 2026-04-30
```

## Project structure

```
.
├── flake.nix              # Nix dev shell (golem 1.5, node 24)
├── backend/
│   ├── golem.yaml         # Golem app manifest + HTTP API config
│   ├── src/
│   │   ├── types.ts       # Shared data types
│   │   ├── member-agent.ts
│   │   ├── team-agent.ts
│   │   └── main.ts
│   └── package.json
└── cli/
    ├── src/
    │   ├── main.ts        # Entry point, command tree
    │   ├── config.ts      # Config service (Effect Layer)
    │   ├── api/
    │   │   └── client.ts  # HTTP API client (Effect + @effect/platform)
    │   └── commands/
    │       ├── init.ts
    │       ├── start.ts
    │       ├── stop.ts
    │       ├── log.ts
    │       ├── status.ts
    │       ├── list.ts
    │       ├── delete.ts
    │       └── team.ts
    ├── package.json
    └── tsconfig.json
```
