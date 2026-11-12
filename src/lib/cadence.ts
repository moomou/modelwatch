export type ModelCategory = 'frontier' | 'workhorse' | 'fast' | 'coding' | 'multimodal';
export type ModelAccess = 'proprietary' | 'open-weights';
export type LineLifecycle = 'active' | 'consolidated';

export type CadenceStatus =
  | 'just-released'
  | 'fresh'
  | 'mid-cycle'
  | 'due-soon'
  | 'overdue'
  | 'first-gen'
  | 'consolidated';

export interface Company {
  id: string;
  name: string;
  shortName: string;
  country: string;
  website: string;
  accent: string;
  summary: string;
}

export interface RawRelease {
  version: string;
  releasedAt: string;
  highlights: string;
  sourceUrl: string;
  aaUrl?: string;
  arenaUrl?: string;
}

export interface RawModelLine {
  id: string;
  companyId: string;
  name: string;
  tierLabel: string;
  category: ModelCategory;
  access: ModelAccess;
  lifecycle: LineLifecycle;
  lifecycleNote?: string;
  summary: string;
  aaUrl?: string;
  arenaUrl?: string;
  releases: RawRelease[];
}

export interface ModelCatalog {
  lastVerified: string;
  companies: Company[];
  lines: RawModelLine[];
}

export interface ComputedRelease extends RawRelease {
  /** Days this version remained the latest before the next release, or days since release for the current model. */
  spanDays: number;
  isCurrent: boolean;
}

export interface ComputedModelLine {
  id: string;
  company: Company;
  name: string;
  tierLabel: string;
  category: ModelCategory;
  access: ModelAccess;
  lifecycle: LineLifecycle;
  lifecycleNote?: string;
  summary: string;
  aaUrl?: string;
  arenaUrl?: string;
  currentRelease: ComputedRelease;
  previousRelease: ComputedRelease | null;
  releasesChronological: ComputedRelease[];
  releasesNewestFirst: ComputedRelease[];
  completedIntervalsDays: number[];
  daysSinceRelease: number;
  /** Rolling median of up to the last 5 completed intervals — robust against early outliers and fast point patches. */
  typicalCycleDays: number | null;
  /** Classic MacRumors-style all-time arithmetic mean of all completed intervals. */
  averageCycleDays: number | null;
  minCycleDays: number | null;
  maxCycleDays: number | null;
  /** Ratio of daysSinceRelease / typicalCycleDays (null when only 1 release exists). */
  cycleRatio: number | null;
  /** Signed days relative to typicalCycleDays: negative means days remaining, positive means days past typical cadence. */
  daysDeltaFromTypical: number | null;
  status: CadenceStatus;
  statusLabel: string;
  refreshExpectation: string;
  recommendation: string;
  searchBlob: string;
}

export interface CatalogSummary {
  asOfDate: string;
  lastVerified: string;
  totalCompanies: number;
  totalLines: number;
  activeLines: number;
  totalReleases: number;
  justReleasedCount: number;
  freshCount: number;
  midCycleCount: number;
  dueSoonCount: number;
  overdueCount: number;
  consolidatedCount: number;
  newestLine: ComputedModelLine;
  mostOverdueActiveLine: ComputedModelLine | null;
  fastestActiveLine: ComputedModelLine | null;
}

const MS_PER_UTC_DAY = 86_400_000;
const RECENT_INTERVAL_WINDOW = 5;

export function parseUtcDayNumber(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new Error(`Invalid ISO date "${isoDate}" (expected YYYY-MM-DD)`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcMs = Date.UTC(year, month - 1, day);
  const check = new Date(utcMs);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date "${isoDate}"`);
  }
  return Math.floor(utcMs / MS_PER_UTC_DAY);
}

export function daysBetweenIso(earlierIso: string, laterIso: string): number {
  return parseUtcDayNumber(laterIso) - parseUtcDayNumber(earlierIso);
}

export function getTodayLocalIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIso(isoDate: string, deltaDays: number): string {
  const dayNum = parseUtcDayNumber(isoDate) + Math.round(deltaDays);
  const dt = new Date(dayNum * MS_PER_UTC_DAY);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeMedianRounded(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function computeMeanRounded(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round(sum / values.length);
}

export function classifyStatus(
  lifecycle: LineLifecycle,
  daysSinceRelease: number,
  typicalCycleDays: number | null,
  cycleRatio: number | null
): {
  status: CadenceStatus;
  statusLabel: string;
  refreshExpectation: string;
  recommendation: string;
} {
  if (lifecycle === 'consolidated') {
    return {
      status: 'consolidated',
      statusLabel: 'Superseded',
      refreshExpectation: 'Track succeeded',
      recommendation: 'Lineage folded into or succeeded by a newer track.',
    };
  }

  if (daysSinceRelease <= 14) {
    const exp =
      typicalCycleDays !== null
        ? `Typical cycle ~${typicalCycleDays}d`
        : 'Newly launched';
    return {
      status: 'just-released',
      statusLabel: 'Just Released',
      refreshExpectation: exp,
      recommendation: 'Released within the last two weeks.',
    };
  }

  if (typicalCycleDays === null || cycleRatio === null) {
    return {
      status: 'first-gen',
      statusLabel: 'First Release',
      refreshExpectation: 'No prior cycle yet',
      recommendation: 'Inaugural generation — no historical refresh interval yet.',
    };
  }

  const delta = daysSinceRelease - typicalCycleDays;

  if (cycleRatio < 0.55) {
    return {
      status: 'fresh',
      statusLabel: 'Early Cycle',
      refreshExpectation: `~${Math.abs(delta)}d to typical refresh`,
      recommendation: 'Early in its typical historical refresh window.',
    };
  }

  if (cycleRatio < 0.85) {
    return {
      status: 'mid-cycle',
      statusLabel: 'Mid-Cycle',
      refreshExpectation: `~${Math.abs(delta)}d to typical refresh`,
      recommendation: 'Midway through its typical historical cadence.',
    };
  }

  if (cycleRatio <= 1.1) {
    const winText =
      delta < 0
        ? `~${Math.abs(delta)}d from ~${typicalCycleDays}d cycle`
        : delta === 0
          ? `At ~${typicalCycleDays}d typical mark`
          : `+${delta}d past ~${typicalCycleDays}d mark`;
    return {
      status: 'due-soon',
      statusLabel: 'Refresh Window',
      refreshExpectation: winText,
      recommendation: 'Inside the typical refresh window based on recent releases.',
    };
  }

  return {
    status: 'overdue',
    statusLabel: 'Past Typical Cycle',
    refreshExpectation: `+${delta}d past ~${typicalCycleDays}d cycle`,
    recommendation: 'Past its typical historical refresh interval — next update could land soon.',
  };
}

export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}, ${y}`;
}

export function formatMonthYear(isoDate: string): string {
  const [y, m] = isoDate.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${y}`;
}

export function computeCatalogMetrics(
  catalog: ModelCatalog,
  asOfIso: string = getTodayLocalIso()
): { lines: ComputedModelLine[]; summary: CatalogSummary; companies: Company[] } {
  const companyMap = new Map<string, Company>();
  for (const c of catalog.companies) {
    companyMap.set(c.id, c);
  }

  const computedLines: ComputedModelLine[] = catalog.lines.map((raw) => {
    const company = companyMap.get(raw.companyId);
    if (!company) {
      throw new Error(`Unknown companyId "${raw.companyId}" on line "${raw.id}"`);
    }

    const sortedRaw = [...raw.releases].sort((a, b) => a.releasedAt.localeCompare(b.releasedAt));
    // Only include releases on or before asOfIso when time-traveling via ?asOf=YYYY-MM-DD;
    // fallback to earliest release if asOfIso precedes the whole line.
    const visibleRaw = sortedRaw.filter((r) => r.releasedAt <= asOfIso);
    const effectiveRaw = visibleRaw.length > 0 ? visibleRaw : [sortedRaw[0]];

    const completedIntervalsDays: number[] = [];
    const releasesChronological: ComputedRelease[] = effectiveRaw.map((rel, idx) => {
      const isCurrent = idx === effectiveRaw.length - 1;
      if (!isCurrent) {
        const nextRel = effectiveRaw[idx + 1];
        const span = Math.max(1, daysBetweenIso(rel.releasedAt, nextRel.releasedAt));
        completedIntervalsDays.push(span);
        return { ...rel, spanDays: span, isCurrent: false };
      }
      const elapsed = Math.max(0, daysBetweenIso(rel.releasedAt, asOfIso));
      return { ...rel, spanDays: elapsed, isCurrent: true };
    });

    const currentRelease = releasesChronological[releasesChronological.length - 1];
    const previousRelease =
      releasesChronological.length >= 2
        ? releasesChronological[releasesChronological.length - 2]
        : null;

    const recentSlice = completedIntervalsDays.slice(-RECENT_INTERVAL_WINDOW);
    const typicalCycleDays = computeMedianRounded(recentSlice);
    const averageCycleDays = computeMeanRounded(completedIntervalsDays);
    const minCycleDays =
      completedIntervalsDays.length > 0 ? Math.min(...completedIntervalsDays) : null;
    const maxCycleDays =
      completedIntervalsDays.length > 0 ? Math.max(...completedIntervalsDays) : null;

    const daysSinceRelease = currentRelease.spanDays;
    const cycleRatio =
      typicalCycleDays !== null && typicalCycleDays > 0
        ? daysSinceRelease / typicalCycleDays
        : null;
    const daysDeltaFromTypical =
      typicalCycleDays !== null ? daysSinceRelease - typicalCycleDays : null;

    const { status, statusLabel, refreshExpectation, recommendation } = classifyStatus(
      raw.lifecycle,
      daysSinceRelease,
      typicalCycleDays,
      cycleRatio
    );

    const searchBlob = [
      company.name,
      company.shortName,
      raw.name,
      raw.tierLabel,
      raw.category,
      raw.access,
      statusLabel,
      raw.summary,
      ...releasesChronological.map((r) => `${r.version} ${r.highlights}`),
    ]
      .join(' ')
      .toLowerCase();

    return {
      id: raw.id,
      company,
      name: raw.name,
      tierLabel: raw.tierLabel,
      category: raw.category,
      access: raw.access,
      lifecycle: raw.lifecycle,
      lifecycleNote: raw.lifecycleNote,
      summary: raw.summary,
      aaUrl: raw.aaUrl,
      arenaUrl: raw.arenaUrl,
      currentRelease,
      previousRelease,
      releasesChronological,
      releasesNewestFirst: [...releasesChronological].reverse(),
      completedIntervalsDays,
      daysSinceRelease,
      typicalCycleDays,
      averageCycleDays,
      minCycleDays,
      maxCycleDays,
      cycleRatio,
      daysDeltaFromTypical,
      status,
      statusLabel,
      refreshExpectation,
      recommendation,
      searchBlob,
    };
  });

  const activeLines = computedLines.filter((l) => l.lifecycle === 'active');

  const newestLine = [...computedLines].sort(
    (a, b) =>
      a.daysSinceRelease - b.daysSinceRelease ||
      b.currentRelease.releasedAt.localeCompare(a.currentRelease.releasedAt)
  )[0];

  const overdueCandidates = activeLines
    .filter((l) => l.cycleRatio !== null && (l.status === 'overdue' || l.status === 'due-soon'))
    .sort((a, b) => (b.cycleRatio ?? 0) - (a.cycleRatio ?? 0));

  const fastestCandidates = activeLines
    .filter((l) => l.typicalCycleDays !== null && l.completedIntervalsDays.length >= 2)
    .sort((a, b) => (a.typicalCycleDays ?? 9999) - (b.typicalCycleDays ?? 9999));

  const summary: CatalogSummary = {
    asOfDate: asOfIso,
    lastVerified: catalog.lastVerified,
    totalCompanies: catalog.companies.length,
    totalLines: computedLines.length,
    activeLines: activeLines.length,
    totalReleases: computedLines.reduce((acc, l) => acc + l.releasesChronological.length, 0),
    justReleasedCount: computedLines.filter((l) => l.status === 'just-released').length,
    freshCount: computedLines.filter((l) => l.status === 'fresh').length,
    midCycleCount: computedLines.filter((l) => l.status === 'mid-cycle').length,
    dueSoonCount: computedLines.filter((l) => l.status === 'due-soon').length,
    overdueCount: computedLines.filter((l) => l.status === 'overdue').length,
    consolidatedCount: computedLines.filter((l) => l.status === 'consolidated').length,
    newestLine,
    mostOverdueActiveLine: overdueCandidates[0] ?? null,
    fastestActiveLine: fastestCandidates[0] ?? null,
  };

  return {
    lines: computedLines,
    summary,
    companies: catalog.companies,
  };
}
