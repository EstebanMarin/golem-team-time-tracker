// ── ANSI helpers ──────────────────────────────────────────────────────────────

export const ansi = {
  reset:     '\x1b[0m',
  bold:      '\x1b[1m',
  dim:       '\x1b[2m',
  green:     '\x1b[32m',
  yellow:    '\x1b[33m',
  blue:      '\x1b[34m',
  cyan:      '\x1b[36m',
  gray:      '\x1b[90m',
  red:       '\x1b[91m',
  bgGreen:   '\x1b[42m',
};

const r = ansi.reset;
export const bold   = (s: string) => `${ansi.bold}${s}${r}`;
export const dim    = (s: string) => `${ansi.dim}${s}${r}`;
export const green  = (s: string) => `${ansi.green}${s}${r}`;
export const yellow = (s: string) => `${ansi.yellow}${s}${r}`;
export const cyan   = (s: string) => `${ansi.cyan}${s}${r}`;
export const gray   = (s: string) => `${ansi.gray}${s}${r}`;
export const blue   = (s: string) => `${ansi.blue}${s}${r}`;

// ── Duration helpers ──────────────────────────────────────────────────────────

export const formatDuration = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

/** Compact 4-char duration for grid cells: "8h30", "45m ", "    " */
export const formatCell = (mins: number): string => {
  if (mins === 0) return '    ';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${mins}m `.slice(0, 4).padEnd(4);
  if (m === 0) return `${h}h  `.slice(0, 4).padEnd(4);
  return `${h}h${String(m).padStart(2, '0')}`.slice(0, 4).padEnd(4);
};

// ── Bar chart helpers ─────────────────────────────────────────────────────────

/** Render a progress bar using block chars. maxMins defaults to 8h. */
export const makeBar = (mins: number, maxMins = 480, width = 24): string => {
  const filled = Math.min(Math.round((mins / maxMins) * width), width);
  return green('█'.repeat(filled)) + gray('░'.repeat(width - filled));
};

// ── Date helpers ──────────────────────────────────────────────────────────────

export const todayStr = (): string => new Date().toISOString().split('T')[0]!;

export const toDateStr = (d: Date): string => d.toISOString().split('T')[0]!;

export const parseYYYYMM = (s: string): { year: number; month: number } | null => {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  return { year: parseInt(m[1]!), month: parseInt(m[2]!) };
};

export const currentYearMonth = (): { year: number; month: number } => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

export const monthRange = (
  year: number,
  month: number,
): { from: string; to: string; daysInMonth: number; firstDow: number } => {
  const first = new Date(year, month - 1, 1);
  const last  = new Date(year, month, 0);
  // firstDow: 0=Mon … 6=Sun (ISO week)
  const rawDow = first.getDay(); // 0=Sun
  const firstDow = rawDow === 0 ? 6 : rawDow - 1;
  return {
    from: toDateStr(first),
    to:   toDateStr(last),
    daysInMonth: last.getDate(),
    firstDow,
  };
};

export const weekRange = (offsetWeeks = 0): { from: string; to: string; dates: string[] } => {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offsetWeeks * 7);
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateStr(d);
  });
  return { from: dates[0]!, to: dates[6]!, dates };
};

export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export const DAY_NAMES_SHORT = ['Mo','Tu','We','Th','Fr','Sa','Su'];
export const DAY_NAMES_LONG  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
