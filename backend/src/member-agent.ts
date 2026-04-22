import { BaseAgent, agent, endpoint, Result } from '@golemcloud/golem-ts-sdk';
import type { TimeEntry, RunningTimer } from './types.js';

@agent({ mount: '/members/{memberId}' })
export class MemberAgent extends BaseAgent {
  private entries: TimeEntry[] = [];
  private runningTimer: RunningTimer | null = null;

  constructor(private memberId: string) {
    super();
  }

  @endpoint({ post: '/start' })
  startTimer(project: string, description: string, tags: string[]): TimeEntry {
    // Auto-stop any running timer
    if (this.runningTimer !== null) {
      this._stopRunning();
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const date = now.split('T')[0]!;
    const entry: TimeEntry = {
      id,
      project,
      description,
      startTime: now,
      endTime: null,
      durationMinutes: null,
      tags,
      date,
    };
    this.entries.push(entry);
    this.runningTimer = { entryId: id, project, description, startTime: now };
    return entry;
  }

  @endpoint({ post: '/stop' })
  stopTimer(): Result<TimeEntry, { error: string }> {
    if (this.runningTimer === null) {
      return Result.err({ error: 'No timer is currently running' });
    }
    const stopped = this._stopRunning();
    if (!stopped) {
      return Result.err({ error: 'Timer entry not found' });
    }
    return Result.ok(stopped);
  }

  @endpoint({ post: '/log' })
  logTime(
    project: string,
    description: string,
    durationMinutes: number,
    date: string,
    tags: string[],
  ): TimeEntry {
    const id = crypto.randomUUID();
    const entry: TimeEntry = {
      id,
      project,
      description,
      startTime: `${date}T00:00:00.000Z`,
      endTime: `${date}T00:00:00.000Z`,
      durationMinutes,
      tags,
      date,
    };
    this.entries.push(entry);
    return entry;
  }

  @endpoint({ get: '/status' })
  getStatus(): RunningTimer | undefined {
    return this.runningTimer ?? undefined;
  }

  @endpoint({ get: '/entries?from={from}&to={to}' })
  getEntries(from: string | undefined, to: string | undefined): TimeEntry[] {
    return this.entries.filter(e => {
      if (from !== undefined && e.date < from) return false;
      if (to !== undefined && e.date > to) return false;
      return true;
    });
  }

  @endpoint({ delete: '/entries/{entryId}' })
  deleteEntry(entryId: string): Result<void, { error: string }> {
    const idx = this.entries.findIndex(e => e.id === entryId);
    if (idx === -1) return Result.err({ error: 'Entry not found' });
    this.entries.splice(idx, 1);
    if (this.runningTimer?.entryId === entryId) {
      this.runningTimer = null;
    }
    return Result.ok(undefined);
  }

  // Internal helper — not exposed as an endpoint
  private _stopRunning(): TimeEntry | null {
    if (this.runningTimer === null) return null;
    const now = new Date().toISOString();
    const idx = this.entries.findIndex(e => e.id === this.runningTimer!.entryId);
    if (idx === -1) {
      this.runningTimer = null;
      return null;
    }
    const entry = this.entries[idx]!;
    const durationMinutes = Math.round(
      (new Date(now).getTime() - new Date(entry.startTime).getTime()) / 60_000,
    );
    const updated: TimeEntry = { ...entry, endTime: now, durationMinutes };
    this.entries[idx] = updated;
    this.runningTimer = null;
    return updated;
  }
}
