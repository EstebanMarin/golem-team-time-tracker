export type TimeEntry = {
  id: string;
  project: string;
  description: string;
  startTime: string;           // ISO 8601
  endTime: string | null;      // null = still running
  durationMinutes: number | null; // null = still running
  tags: string[];
  date: string;                // YYYY-MM-DD
};

export type RunningTimer = {
  entryId: string;
  project: string;
  description: string;
  startTime: string;
};

export type Member = {
  id: string;
  name: string;
  registeredAt: string;
};

export type ProjectTime = { project: string; minutes: number };

export type TeamSummaryRow = {
  memberId: string;
  memberName: string;
  totalMinutes: number;
  entries: number;
  projects: ProjectTime[];
};
