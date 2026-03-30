import { loadRecords } from "./records";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReportSettings {
  enabled: boolean;
  type: "monthly" | "quarterly";
  /** Day of month (1–28) on which to run */
  dayOfMonth: number;
}

export interface GeneratedReport {
  id: string;
  generatedAt: string;   // ISO
  type: "monthly" | "quarterly";
  period: string;        // e.g. "March 2026" or "Q1 2026"
  recordCount: number;
  content: string;       // JSON snapshot of records
}

// ─── Storage keys ────────────────────────────────────────────────────────────

const SETTINGS_KEY = "auto-report-settings";
const REPORTS_KEY  = "auto-report-history";

// ─── Settings ────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: ReportSettings = {
  enabled: false,
  type: "monthly",
  dayOfMonth: 1,
};

export function loadSettings(): ReportSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ReportSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: ReportSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ─── Report history ──────────────────────────────────────────────────────────

export function loadReports(): GeneratedReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReports(reports: GeneratedReport[]): void {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

// ─── Date helpers ────────────────────────────────────────────────────────────

/** Returns the quarter label and the last month of that quarter (0-indexed). */
function quarterInfo(month: number): { label: string; lastMonth: number } {
  if (month <= 2) return { label: "Q1", lastMonth: 2 };   // Jan–Mar
  if (month <= 5) return { label: "Q2", lastMonth: 5 };   // Apr–Jun
  if (month <= 8) return { label: "Q3", lastMonth: 8 };   // Jul–Sep
  return { label: "Q4", lastMonth: 11 };                   // Oct–Dec
}

function periodLabel(settings: ReportSettings, refDate: Date): string {
  if (settings.type === "monthly") {
    return refDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  }
  const { label } = quarterInfo(refDate.getMonth());
  return `${label} ${refDate.getFullYear()}`;
}

/**
 * Computes the next date on which a report should be generated.
 * Returns null when scheduling is disabled.
 */
export function getNextRunDate(settings: ReportSettings): Date | null {
  if (!settings.enabled) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (settings.type === "monthly") {
    // Try current month first, then next month
    const candidate = new Date(today.getFullYear(), today.getMonth(), settings.dayOfMonth);
    if (candidate >= today) return candidate;
    // Roll forward one month
    return new Date(today.getFullYear(), today.getMonth() + 1, settings.dayOfMonth);
  }

  // Quarterly: run on settings.dayOfMonth of the last month of each quarter
  const quarters = [
    new Date(today.getFullYear(), 2,  settings.dayOfMonth), // Mar
    new Date(today.getFullYear(), 5,  settings.dayOfMonth), // Jun
    new Date(today.getFullYear(), 8,  settings.dayOfMonth), // Sep
    new Date(today.getFullYear(), 11, settings.dayOfMonth), // Dec
  ];

  const future = quarters.find((d) => d >= today);
  if (future) return future;
  // All quarters passed this year → first quarter next year
  return new Date(today.getFullYear() + 1, 2, settings.dayOfMonth);
}

// ─── Generation ──────────────────────────────────────────────────────────────

export function generateReport(settings: ReportSettings): GeneratedReport {
  const records = loadRecords();
  const now = new Date();
  const report: GeneratedReport = {
    id: String(Date.now()),
    generatedAt: now.toISOString(),
    type: settings.type,
    period: periodLabel(settings, now),
    recordCount: records.length,
    content: JSON.stringify(records, null, 2),
  };

  const history = loadReports();
  saveReports([report, ...history]);
  return report;
}

/**
 * Called on app load and periodically. Generates a report automatically
 * if the scheduled date has been reached and no report was already generated
 * today for this period.
 */
export function checkAndRun(): GeneratedReport | null {
  const settings = loadSettings();
  if (!settings.enabled) return null;

  const next = getNextRunDate(settings);
  if (!next) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDay = new Date(next);
  nextDay.setHours(0, 0, 0, 0);

  if (nextDay.getTime() !== today.getTime()) return null;

  // Check if we already generated a report today for this period
  const history = loadReports();
  const todayStr = today.toISOString().split("T")[0];
  const alreadyRan = history.some(
    (r) => r.generatedAt.startsWith(todayStr) && r.type === settings.type
  );
  if (alreadyRan) return null;

  return generateReport(settings);
}

// ─── Download helper ─────────────────────────────────────────────────────────

export function downloadReport(report: GeneratedReport): void {
  const blob = new Blob([report.content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `report-${report.type}-${report.period.replace(/\s+/g, "-")}-${report.generatedAt.split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
