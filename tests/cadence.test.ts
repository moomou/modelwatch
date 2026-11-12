import { describe, expect, it } from 'vitest';
import catalogJson from '../src/data/models.json';
import {
  addDaysIso,
  computeCatalogMetrics,
  computeMedianRounded,
  daysBetweenIso,
  ModelCatalog,
  parseUtcDayNumber,
} from '../src/lib/cadence';
import {
  localizeCurrentHighlights,
  localizeLineName,
  localizeStatus,
  localizeTierLabel,
} from '../src/lib/i18n';
import { resolveModelLinks } from '../src/lib/links';
import { filterAndSortLines, FilterState } from '../src/ui/render';
import { validateCatalog } from '../scripts/validate-data.mjs';

describe('UTC calendar date math', () => {
  it('computes exact integer days across DST transitions and leap years', () => {
    expect(daysBetweenIso('2024-02-28', '2024-03-01')).toBe(2); // 2024 leap year
    expect(daysBetweenIso('2025-02-28', '2025-03-01')).toBe(1);
    expect(daysBetweenIso('2026-03-07', '2026-03-09')).toBe(2); // US DST spring forward
    expect(daysBetweenIso('2026-10-31', '2026-11-02')).toBe(2); // US DST fall back
    expect(addDaysIso('2026-09-22', 50)).toBe('2026-11-11');
  });

  it('rejects impossible calendar dates', () => {
    expect(() => parseUtcDayNumber('2026-02-29')).toThrow();
    expect(() => parseUtcDayNumber('2026-13-01')).toThrow();
    expect(() => parseUtcDayNumber('2026/11/11')).toThrow();
  });
});

describe('Cadence engine & outlier resistance', () => {
  it('uses rolling 5-cycle median so single early gaps or 7-day point patches do not distort typical cadence', () => {
    // Example: Claude Opus intervals [444, 75, 111, 73, 70, 42, 57, 60]
    const intervals = [444, 75, 111, 73, 70, 42, 57, 60];
    const recentFive = intervals.slice(-5); // [73, 70, 42, 57, 60]
    expect(computeMedianRounded(recentFive)).toBe(60);

    // Example: GPT Sol recent 5 with a 7-day point release [84, 49, 77, 75, 7] -> median 75
    expect(computeMedianRounded([84, 49, 77, 75, 7])).toBe(75);
  });

  it('prevents consolidated lines from inflating active overdue alerts', () => {
    const { lines, summary } = computeCatalogMetrics(
      catalogJson as ModelCatalog,
      '2026-11-11'
    );

    const llama = lines.find((l) => l.id === 'meta-llama')!;
    expect(llama.daysSinceRelease).toBe(585);
    expect(llama.status).toBe('consolidated');

    const overdueActive = lines.filter((l) => l.status === 'overdue');
    expect(overdueActive.every((l) => l.lifecycle === 'active')).toBe(true);
    expect(summary.overdueCount).toBe(overdueActive.length);
  });

  it('supports deterministic time-travel via asOf date', () => {
    const octSnapshot = computeCatalogMetrics(
      catalogJson as ModelCatalog,
      '2026-10-15'
    );
    const geminiPro = octSnapshot.lines.find((l) => l.id === 'google-gemini-pro')!;
    // On Oct 15, 2026, Gemini 4 Argon (2026-10-13) was current (2 days old), before Carbon (2026-11-10)
    expect(geminiPro.currentRelease.version).toBe('Gemini 4 Argon');
    expect(geminiPro.daysSinceRelease).toBe(2);
    expect(geminiPro.status).toBe('just-released');
  });
});

describe('Catalog data quality & filter behavior', () => {
  it('passes all strict catalog invariants', () => {
    const validation = validateCatalog(catalogJson);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('filters and sorts tracks accurately', () => {
    const { lines } = computeCatalogMetrics(
      catalogJson as ModelCatalog,
      '2026-11-11'
    );

    const baseFilter: FilterState = {
      query: '',
      companyId: 'anthropic',
      category: 'all',
      access: 'all',
      statusFilter: 'all',
      sort: 'newest',
      view: 'cards',
      hideConsolidated: false,
    };

    const anthropicNewest = filterAndSortLines(lines, baseFilter);
    expect(anthropicNewest.map((l) => l.id)).toEqual([
      'anthropic-fable', // 2d
      'anthropic-haiku', // 35d
      'anthropic-sonnet', // 44d
      'anthropic-opus', // 50d
    ]);

    const { summary } = computeCatalogMetrics(
      catalogJson as ModelCatalog,
      '2026-11-11'
    );
    const countFor = (statusFilter: FilterState['statusFilter']) =>
      filterAndSortLines(lines, {
        ...baseFilter,
        companyId: 'all',
        statusFilter,
      }).length;

    expect(countFor('just-released')).toBe(summary.justReleasedCount);
    expect(countFor('safe')).toBe(
      summary.justReleasedCount + summary.freshCount + summary.midCycleCount
    );
    expect(countFor('fresh-mid')).toBe(summary.freshCount + summary.midCycleCount);
    expect(countFor('watch')).toBe(summary.dueSoonCount + summary.overdueCount);
    expect(countFor('consolidated')).toBe(summary.consolidatedCount);
  });

  it('uses refresh-timing labels (never hardware-buying labels) and resolves valid AA & Arena URLs for every release', () => {
    const { lines } = computeCatalogMetrics(
      catalogJson as ModelCatalog,
      '2026-11-12'
    );

    const known404ProviderUrls = new Set([
      'https://artificialanalysis.ai/providers/alibaba',
      'https://artificialanalysis.ai/providers/microsoft',
      'https://artificialanalysis.ai/providers/nvidia',
      'https://artificialanalysis.ai/providers/moonshot',
    ]);

    for (const line of lines) {
      expect(line.statusLabel).not.toMatch(/caution|overdue|buy/i);
      expect(line.refreshExpectation.length).toBeGreaterThan(3);

      for (const rel of line.releasesChronological) {
        const links = resolveModelLinks(line, rel);
        expect(links.officialUrl.startsWith('https://')).toBe(true);
        expect(links.artificialAnalysisUrl.startsWith('https://artificialanalysis.ai/')).toBe(true);
        expect(known404ProviderUrls.has(links.artificialAnalysisUrl)).toBe(false);
        expect(links.arenaUrl.startsWith('https://arena.ai/')).toBe(true);
      }
    }
  });

  it('provides complete Chinese (zh) localization and supports Chinese search queries', () => {
    const { lines } = computeCatalogMetrics(
      catalogJson as ModelCatalog,
      '2026-11-12'
    );

    for (const line of lines) {
      const zhName = localizeLineName(line, 'zh');
      const zhTier = localizeTierLabel(line.tierLabel, 'zh');
      const zhDesc = localizeCurrentHighlights(line, 'zh');
      const zhStatus = localizeStatus(
        line.status,
        line.lifecycle,
        line.daysSinceRelease,
        line.typicalCycleDays,
        'zh'
      );

      expect(zhName.length).toBeGreaterThan(2);
      expect(/[\u4e00-\u9fff]/.test(zhTier)).toBe(true);
      expect(/[\u4e00-\u9fff]/.test(zhDesc)).toBe(true);
      expect(/[\u4e00-\u9fff]/.test(zhStatus.label)).toBe(true);
      expect(/[\u4e00-\u9fff]/.test(zhStatus.expectation)).toBe(true);
    }

    const openMatches = filterAndSortLines(lines, {
      query: '開源',
      companyId: 'all',
      category: 'all',
      access: 'all',
      statusFilter: 'all',
      sort: 'company',
      view: 'cards',
      hideConsolidated: false,
    });
    expect(openMatches.length).toBeGreaterThan(10);
  });
});
