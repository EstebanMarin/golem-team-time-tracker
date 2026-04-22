export type TimeEntry = {
  id: string;
  project: string;
  description: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  tags: string[];
  date: string;
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
