# Golem Team Time Tracker

Most small teams end up paying for Toggl. It works, but it is a SaaS dependency — your team's time data lives on someone else's infrastructure, the pricing scales with headcount, and you have no control over the stack.

This project replaces it with something you own entirely: a CLI your team installs, backed by a durable agent runtime that you run yourself. No database to manage, no cloud vendor to pay, no data leaving your infrastructure.

## The idea

The backend runs on [Golem](https://golem.cloud) — a durable execution runtime that compiles TypeScript to WASM. Every state change is written to an append-only oplog before it is acknowledged. This means:

- No database. State is the oplog.
- No data loss on crash or power cut. The server replays on restart.
- No deployment complexity. One process, one directory.

- <img width="854" height="664" alt="image" src="https://github.com/user-attachments/assets/897de3f5-ee48-4a85-9016-215a1426316b" />


The CLI is built with [Effect](https://effect.website) — typed errors, composable layers, no runtime surprises.

The deeper point this project makes: a business process that most teams outsource to a SaaS product can run on a **Raspberry Pi Zero 2W** sitting on a desk. Golem's durable execution model makes that viable. Power it off, power it back on, run `golem server run` — everything is there. The operational profile of a Pi running Golem is closer to a router than a server.

## Getting started

```bash
nix develop
```

The shell installs CLI dependencies and prints all available commands.

## Backend

```bash
# Terminal 1
cd backend && golem server run

# Terminal 2
cd backend && golem build && golem deploy
```

To redeploy after code changes:

```bash
golem build && golem deploy --reset
```

> `--reset` wipes agent state. Omit it to preserve existing data across deploys.

## CLI

```bash
# One-time setup
tt register --id alice --name "Alice Smith"
tt project add golem-tracker

# Log a full month of working days
tt fill --month 2026-05 --project golem-tracker --hours 8

# Or just this week
tt fill --week --project golem-tracker --hours 8

# View your time
tt list --monthly
tt list --daily
tt list

# Live tracking
tt start "golem-tracker" "implementing durable agents"
tt status
tt stop
```

## Architecture

```
backend/
  MemberAgent(id)   per-member durable agent — time entries, running timer
  TeamAgent         singleton — member registry, cross-member reporting

cli/
  tt register       one-time setup, registers on backend
  tt project        manage local project list
  tt fill           bulk-log working days for a month or week
  tt list           table / calendar / daily grouped view
  tt start/stop     live timer
  tt log            manual entry
  tt team           team-wide commands
```

State is stored in Golem's oplog on disk. No database process, no migrations, no backups to configure.

## Running on a Raspberry Pi

The entire backend runs on a Raspberry Pi Zero 2W. To expose it to your team without opening ports on your network:

```bash
cloudflared tunnel --url http://localhost:9006
```

Then point the CLI at the public URL:

```bash
tt register --id alice --name "Alice Smith" --server https://your-tunnel-url
```

If the Pi loses power, bring it back up with `golem server run`. No recovery procedure, no data loss.
