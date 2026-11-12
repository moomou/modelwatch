import {
  CatalogSummary,
  CadenceStatus,
  Company,
  ComputedModelLine,
  ComputedRelease,
  daysBetweenIso,
  ModelAccess,
  ModelCategory,
} from '../lib/cadence';
import {
  Locale,
  localizeCurrentHighlights,
  localizeDate,
  localizeLineName,
  localizeMonthYear,
  localizeStatus,
  localizeTierLabel,
  UI_STRINGS,
} from '../lib/i18n';
import { resolveModelLinks } from '../lib/links';
import { renderCompanyMark, UI_ICONS } from './icons';

export type ViewMode = 'cards' | 'matrix' | 'timeline';
export type SortMode = 'company' | 'newest' | 'overdue' | 'oldest' | 'fastest';
export type StatusFilter =
  | 'all'
  | 'just-released'
  | 'safe'
  | 'fresh-mid'
  | 'watch'
  | 'overdue'
  | 'consolidated';

export interface FilterState {
  query: string;
  companyId: string;
  category: 'all' | ModelCategory;
  access: 'all' | ModelAccess;
  statusFilter: StatusFilter;
  sort: SortMode;
  view: ViewMode;
  hideConsolidated: boolean;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function matchesStatusFilter(status: CadenceStatus, filter: StatusFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'just-released':
      return status === 'just-released';
    case 'safe':
      return status === 'just-released' || status === 'fresh' || status === 'mid-cycle';
    case 'fresh-mid':
      return status === 'fresh' || status === 'mid-cycle';
    case 'watch':
      return status === 'due-soon' || status === 'overdue';
    case 'overdue':
      return status === 'overdue';
    case 'consolidated':
      return status === 'consolidated';
  }
}

export function filterAndSortLines(
  lines: ComputedModelLine[],
  state: FilterState
): ComputedModelLine[] {
  const q = state.query.trim().toLowerCase();

  const filtered = lines.filter((line) => {
    if (
      state.hideConsolidated &&
      line.lifecycle === 'consolidated' &&
      state.statusFilter !== 'consolidated'
    ) {
      return false;
    }
    if (state.companyId !== 'all' && line.company.id !== state.companyId) {
      return false;
    }
    if (state.category !== 'all' && line.category !== state.category) {
      return false;
    }
    if (state.access !== 'all' && line.access !== state.access) {
      return false;
    }
    if (!matchesStatusFilter(line.status, state.statusFilter)) {
      return false;
    }
    if (q.length > 0) {
      const zhName = localizeLineName(line, 'zh').toLowerCase();
      const zhTier = localizeTierLabel(line.tierLabel, 'zh').toLowerCase();
      const zhDesc = localizeCurrentHighlights(line, 'zh').toLowerCase();
      if (
        !line.searchBlob.includes(q) &&
        !zhName.includes(q) &&
        !zhTier.includes(q) &&
        !zhDesc.includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const sorted = [...filtered];
  switch (state.sort) {
    case 'newest':
      sorted.sort(
        (a, b) =>
          a.daysSinceRelease - b.daysSinceRelease ||
          a.company.name.localeCompare(b.company.name)
      );
      break;
    case 'oldest':
      sorted.sort(
        (a, b) =>
          b.daysSinceRelease - a.daysSinceRelease ||
          a.company.name.localeCompare(b.company.name)
      );
      break;
    case 'overdue':
      sorted.sort((a, b) => {
        const aActive = a.lifecycle === 'active' ? 1 : 0;
        const bActive = b.lifecycle === 'active' ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        const aRatio = a.cycleRatio ?? -1;
        const bRatio = b.cycleRatio ?? -1;
        return bRatio - aRatio || b.daysSinceRelease - a.daysSinceRelease;
      });
      break;
    case 'fastest':
      sorted.sort((a, b) => {
        const aCadence = a.typicalCycleDays ?? 99_999;
        const bCadence = b.typicalCycleDays ?? 99_999;
        return aCadence - bCadence || a.daysSinceRelease - b.daysSinceRelease;
      });
      break;
    case 'company':
    default:
      break;
  }

  return sorted;
}

type RefreshTone = 'green' | 'neutral' | 'window' | 'past';

function getRefreshTone(status: CadenceStatus): RefreshTone {
  switch (status) {
    case 'just-released':
    case 'fresh':
      return 'green';
    case 'due-soon':
      return 'window';
    case 'overdue':
      return 'past';
    case 'mid-cycle':
    case 'first-gen':
    case 'consolidated':
    default:
      return 'neutral';
  }
}

function renderFullModelLinks(
  line: ComputedModelLine,
  release: ComputedRelease,
  locale: Locale
): string {
  const t = UI_STRINGS[locale];
  const links = resolveModelLinks(line, release);
  return `
    <div class="model-links">
      <a href="${escapeHtml(links.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.linkReleasePost)} ${UI_ICONS.external}</a>
      <span class="link-dot">·</span>
      <a href="${escapeHtml(links.artificialAnalysisUrl)}" target="_blank" rel="noopener noreferrer">Artificial Analysis ${UI_ICONS.external}</a>
      <span class="link-dot">·</span>
      <a href="${escapeHtml(links.arenaUrl)}" target="_blank" rel="noopener noreferrer">Arena ${UI_ICONS.external}</a>
    </div>
  `;
}

function renderCompactModelLinks(
  line: ComputedModelLine,
  release: ComputedRelease,
  locale: Locale
): string {
  const t = UI_STRINGS[locale];
  const links = resolveModelLinks(line, release);
  return `
    <span class="compact-links">
      <a href="${escapeHtml(links.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.linkShortPost)}</a>
      <span>·</span>
      <a href="${escapeHtml(links.artificialAnalysisUrl)}" target="_blank" rel="noopener noreferrer">AA</a>
      <span>·</span>
      <a href="${escapeHtml(links.arenaUrl)}" target="_blank" rel="noopener noreferrer">Arena</a>
    </span>
  `;
}

export function renderTelemetryStrip(
  summary: CatalogSummary,
  state: FilterState,
  locale: Locale
): string {
  const t = UI_STRINGS[locale];
  const watchCount = summary.dueSoonCount + summary.overdueCount;
  const hasQuickFilter = state.statusFilter !== 'all';

  return `
    <div class="telemetry-strip">
      <div class="telemetry-left">
        <span class="tel-stat"><strong>${summary.totalLines}</strong> ${escapeHtml(t.telemetryTracks)}</span>
        <span class="tel-sep">/</span>
        <span class="tel-stat"><strong>${summary.totalCompanies}</strong> ${escapeHtml(t.telemetryLabs)}</span>
        <span class="tel-sep">·</span>
        <button
          type="button"
          class="tel-pill ${state.statusFilter === 'just-released' ? 'is-active' : ''}"
          data-status-toggle="just-released"
        >
          <span class="tel-dot tel-dot--green"></span>
          <strong>${summary.justReleasedCount}</strong> ${escapeHtml(t.telemetryJustReleased)}
        </button>
        <button
          type="button"
          class="tel-pill ${state.statusFilter === 'watch' ? 'is-active' : ''}"
          data-status-toggle="watch"
        >
          <span class="tel-dot tel-dot--past"></span>
          <strong>${watchCount}</strong> ${escapeHtml(t.telemetryRefreshWatch)}
        </button>
        ${
          hasQuickFilter
            ? `<button type="button" class="tel-clear" data-status-toggle="all">× ${escapeHtml(t.telemetryClearFilter)}</button>`
            : ''
        }
      </div>
      <div class="telemetry-right">
        ${escapeHtml(t.telemetryVerified)} <code>${escapeHtml(summary.asOfDate)}</code>
      </div>
    </div>
  `;
}

export function renderCompanyTabs(
  companies: Company[],
  selectedCompanyId: string,
  locale: Locale
): string {
  const t = UI_STRINGS[locale];
  const allTab = `
    <button
      type="button"
      class="lab-tab ${selectedCompanyId === 'all' ? 'is-active' : ''}"
      data-company="all"
    >${escapeHtml(t.allLabs)}</button>
  `;

  const tabs = companies
    .map(
      (c) => `
        <button
          type="button"
          class="lab-tab ${selectedCompanyId === c.id ? 'is-active' : ''}"
          data-company="${escapeHtml(c.id)}"
        >${escapeHtml(c.shortName)}</button>
      `
    )
    .join('');

  return `<nav class="lab-tabs" aria-label="Filter by AI lab">${allTab}${tabs}</nav>`;
}

function renderGuideCard(
  line: ComputedModelLine,
  expandedIds: ReadonlySet<string>,
  showCompanyPrefix: boolean,
  locale: Locale
): string {
  const t = UI_STRINGS[locale];
  const tone = getRefreshTone(line.status);
  const localizedStatus = localizeStatus(
    line.status,
    line.lifecycle,
    line.daysSinceRelease,
    line.typicalCycleDays,
    locale
  );

  const pastAll = line.releasesNewestFirst.slice(1);
  const isExpanded = expandedIds.has(line.id);
  const visiblePast = isExpanded ? pastAll : pastAll.slice(0, 4);
  const hiddenCount = pastAll.length - visiblePast.length;

  const scaleMax = Math.max(
    14,
    line.daysSinceRelease,
    line.typicalCycleDays ?? 0,
    ...visiblePast.map((r) => r.spanDays)
  );

  const currentPct = Math.max(2, Math.round((line.daysSinceRelease / scaleMax) * 100));
  const typicalPct =
    line.typicalCycleDays !== null
      ? Math.min(100, Math.max(2, Math.round((line.typicalCycleDays / scaleMax) * 100)))
      : null;

  const avgNote =
    line.typicalCycleDays !== null &&
    line.averageCycleDays !== null &&
    Math.abs(line.averageCycleDays - line.typicalCycleDays) >= 10
      ? `<span class="row-sublabel">${escapeHtml(
          locale === 'zh'
            ? `${t.meanPrefix} ${line.averageCycleDays} 天`
            : `${t.meanPrefix}: ${line.averageCycleDays}d`
        )}</span>`
      : '';

  const typicalRow =
    line.typicalCycleDays !== null && typicalPct !== null
      ? `
        <div class="bg-metric-row">
          <div class="bg-row-label">
            <span>${escapeHtml(t.typicalCycle)}</span>
            ${avgNote}
          </div>
          <div class="bg-bar-cell">
            <div class="bg-bar-track">
              <div class="bg-bar-fill bg-bar-fill--history" style="width:${typicalPct}%"></div>
            </div>
          </div>
          <div class="bg-row-num">${line.typicalCycleDays}</div>
        </div>
      `
      : `
        <div class="bg-metric-row">
          <div class="bg-row-label">
            <span>${escapeHtml(t.typicalCycle)}</span>
          </div>
          <div class="bg-bar-cell">
            <span class="first-gen-note">${escapeHtml(t.firstReleaseNote)}</span>
          </div>
          <div class="bg-row-num bg-row-num--muted">—</div>
        </div>
      `;

  const recentRows =
    visiblePast.length > 0
      ? `
        <div class="bg-recent-group">
          <div class="bg-recent-label">
            <span>${escapeHtml(t.priorReleases)}</span>
            <span class="row-sublabel">${escapeHtml(t.daysActiveSub)}</span>
          </div>
          <div class="bg-recent-list">
            ${visiblePast
              .map((rel) => {
                const wPct = Math.max(2, Math.round((rel.spanDays / scaleMax) * 100));
                return `
                  <div class="bg-recent-item">
                    <div class="bg-bar-cell">
                      <div class="bg-bar-caption">
                        <span class="rel-caption-left">
                          <span class="rel-date-text">${escapeHtml(localizeMonthYear(rel.releasedAt, locale))}</span>
                          <span class="rel-ver-name">${escapeHtml(rel.version)}</span>
                        </span>
                        ${renderCompactModelLinks(line, rel, locale)}
                      </div>
                      <div class="bg-bar-track">
                        <div class="bg-bar-fill bg-bar-fill--history" style="width:${wPct}%"></div>
                      </div>
                    </div>
                    <div class="bg-row-num bg-row-num--past">${rel.spanDays}</div>
                  </div>
                `;
              })
              .join('')}
            ${
              pastAll.length > 4
                ? `
                  <button
                    type="button"
                    class="expand-history-btn"
                    data-toggle-expand="${escapeHtml(line.id)}"
                  >
                    ${escapeHtml(isExpanded ? t.showFewer : t.expandMore(hiddenCount))}
                  </button>
                `
                : ''
            }
          </div>
        </div>
      `
      : '';

  const tierText = localizeTierLabel(line.tierLabel, locale);
  const tierMeta = [
    showCompanyPrefix ? line.company.shortName : null,
    tierText,
    line.access === 'open-weights' && !line.tierLabel.toLowerCase().includes('open')
      ? t.openWeightsTag
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const daysUnit =
    line.daysSinceRelease === 1 ? t.daysUnitSingular : t.daysUnitPlural;

  return `
    <article class="specimen-card specimen-card--${tone}" id="track-${escapeHtml(line.id)}">
      <header class="specimen-head">
        <div class="specimen-titles">
          <div class="specimen-meta">${escapeHtml(tierMeta)}</div>
          <h3 class="specimen-title">${escapeHtml(localizeLineName(line, locale))}</h3>
          <div class="specimen-stage-row">
            <span class="stage-pill stage-pill--${tone}">${escapeHtml(localizedStatus.label)}</span>
            <span class="refresh-hint">${escapeHtml(localizedStatus.expectation)}</span>
          </div>
        </div>

        <div class="hero-age tone-num--${tone}">
          <span class="hero-age-num">${line.daysSinceRelease}</span>
          <span class="hero-age-unit">${escapeHtml(daysUnit)}</span>
        </div>
      </header>

      <div class="current-specimen">
        <p class="specimen-desc">
          <strong>${escapeHtml(line.currentRelease.version)}</strong>
          <span class="current-date">${escapeHtml(localizeDate(line.currentRelease.releasedAt, locale))}</span>
          <span class="desc-sep">—</span>
          ${escapeHtml(localizeCurrentHighlights(line, locale))}
        </p>
        ${renderFullModelLinks(line, line.currentRelease, locale)}
      </div>

      <div class="bg-metrics">
        <div class="bg-metric-row bg-metric-row--current">
          <div class="bg-row-label">
            <span>${escapeHtml(t.daysSinceRelease)}</span>
          </div>
          <div class="bg-bar-cell">
            <div class="bg-bar-track bg-bar-track--primary">
              <div class="bg-bar-fill tone-bar--${tone}" style="width:${currentPct}%"></div>
              ${
                typicalPct !== null
                  ? `<span class="typical-pin" style="left:${typicalPct}%" title="${escapeHtml(t.typicalCycle)}: ${line.typicalCycleDays}d"></span>`
                  : ''
              }
            </div>
          </div>
          <div class="bg-row-num tone-num--${tone}">${line.daysSinceRelease}</div>
        </div>

        ${typicalRow}
        ${recentRows}
      </div>
    </article>
  `;
}

export function renderCardsView(
  lines: ComputedModelLine[],
  companies: Company[],
  state: FilterState,
  expandedIds: ReadonlySet<string> = new Set(),
  locale: Locale = 'en'
): string {
  if (lines.length === 0) {
    return renderEmptyState(locale);
  }

  if (state.sort !== 'company') {
    return `<div class="guide-grid">${lines.map((l) => renderGuideCard(l, expandedIds, true, locale)).join('')}</div>`;
  }

  const byCompany = new Map<string, ComputedModelLine[]>();
  for (const line of lines) {
    const arr = byCompany.get(line.company.id) ?? [];
    arr.push(line);
    byCompany.set(line.company.id, arr);
  }

  const t = UI_STRINGS[locale];
  return companies
    .filter((c) => byCompany.has(c.id))
    .map((company, idx) => {
      const groupLines = byCompany.get(company.id) ?? [];
      const indexStr = String(idx + 1).padStart(2, '0');
      return `
        <section class="lab-section" id="lab-${escapeHtml(company.id)}">
          <header class="lab-section-head">
            <span class="lab-index">${indexStr}</span>
            ${renderCompanyMark(company.id, 'currentColor', 18)}
            <h2>${escapeHtml(company.name)}</h2>
            <span class="lab-rule" aria-hidden="true"></span>
            <span class="lab-count">${escapeHtml(t.tracksCount(groupLines.length))}</span>
          </header>
          <div class="guide-grid">
            ${groupLines.map((l) => renderGuideCard(l, expandedIds, false, locale)).join('')}
          </div>
        </section>
      `;
    })
    .join('');
}

export function renderMatrixView(
  lines: ComputedModelLine[],
  locale: Locale = 'en'
): string {
  if (lines.length === 0) {
    return renderEmptyState(locale);
  }

  const t = UI_STRINGS[locale];
  const rows = lines
    .map((line) => {
      const tone = getRefreshTone(line.status);
      const localizedStatus = localizeStatus(
        line.status,
        line.lifecycle,
        line.daysSinceRelease,
        line.typicalCycleDays,
        locale
      );
      const scaleMax = Math.max(line.daysSinceRelease, line.typicalCycleDays ?? 60, 30);
      const curPct = Math.max(3, Math.round((line.daysSinceRelease / scaleMax) * 100));
      const typPct =
        line.typicalCycleDays !== null
          ? Math.max(3, Math.round((line.typicalCycleDays / scaleMax) * 100))
          : 0;

      const tierText = localizeTierLabel(line.tierLabel, locale);

      return `
        <tr class="summary-row">
          <td class="td-lab">${escapeHtml(line.company.shortName)}</td>
          <td class="td-track">
            <div class="td-track-name">${escapeHtml(localizeLineName(line, locale))}</div>
            <div class="td-track-meta">${escapeHtml(tierText)}${
              line.access === 'open-weights' && !line.tierLabel.toLowerCase().includes('open')
                ? ` · ${escapeHtml(t.openWeightsTag)}`
                : ''
            }</div>
          </td>
          <td class="td-current">
            <div class="td-model-row">
              <strong>${escapeHtml(line.currentRelease.version)}</strong>
              <span class="td-date">${escapeHtml(localizeDate(line.currentRelease.releasedAt, locale))}</span>
            </div>
            ${renderCompactModelLinks(line, line.currentRelease, locale)}
          </td>
          <td class="td-num">
            <span class="table-days tone-num--${tone}">${line.daysSinceRelease}</span>
          </td>
          <td class="td-num td-typical">
            ${line.typicalCycleDays !== null ? line.typicalCycleDays : '—'}
          </td>
          <td class="td-bars">
            <div class="dual-mini-bars">
              <div class="dual-track"><span class="tone-bar--${tone}" style="width:${curPct}%"></span></div>
              ${
                line.typicalCycleDays !== null
                  ? `<div class="dual-track"><span class="bg-bar-fill--history" style="width:${typPct}%"></span></div>`
                  : ''
              }
            </div>
          </td>
          <td class="td-refresh">
            <span class="stage-pill stage-pill--${tone}">${escapeHtml(localizedStatus.label)}</span>
            <div class="td-track-meta">${escapeHtml(localizedStatus.expectation)}</div>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="table-card">
      <table class="summary-table">
        <thead>
          <tr>
            <th>${escapeHtml(t.tableColLab)}</th>
            <th>${escapeHtml(t.tableColTrack)}</th>
            <th>${escapeHtml(t.tableColModel)}</th>
            <th class="th-num">${escapeHtml(t.tableColDays)}</th>
            <th class="th-num">${escapeHtml(t.tableColTypical)}</th>
            <th>${escapeHtml(t.tableColComparison)}</th>
            <th>${escapeHtml(t.tableColCadence)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export function renderTimelineView(
  lines: ComputedModelLine[],
  asOfIso: string,
  locale: Locale = 'en'
): string {
  if (lines.length === 0) {
    return renderEmptyState(locale);
  }

  const t = UI_STRINGS[locale];

  interface FlatEvent {
    line: ComputedModelLine;
    release: ComputedRelease;
    daysAgo: number;
  }

  const events: FlatEvent[] = [];
  for (const line of lines) {
    for (const rel of line.releasesChronological) {
      events.push({
        line,
        release: rel,
        daysAgo: Math.max(0, daysBetweenIso(rel.releasedAt, asOfIso)),
      });
    }
  }

  events.sort(
    (a, b) =>
      b.release.releasedAt.localeCompare(a.release.releasedAt) ||
      a.line.company.name.localeCompare(b.line.company.name)
  );

  const visibleEvents = events.slice(0, 100);
  const monthGroups = new Map<string, FlatEvent[]>();
  for (const ev of visibleEvents) {
    const mk = ev.release.releasedAt.slice(0, 7);
    const list = monthGroups.get(mk) ?? [];
    list.push(ev);
    monthGroups.set(mk, list);
  }

  return [...monthGroups.entries()]
    .map(([monthKey, items]) => {
      const monthTitle = localizeMonthYear(`${monthKey}-01`, locale);
      const rows = items
        .map((ev) => {
          const desc =
            ev.release.isCurrent && locale === 'zh'
              ? localizeCurrentHighlights(ev.line, 'zh')
              : ev.release.highlights;
          return `
            <div class="log-row">
              <div class="log-date">
                <strong>${escapeHtml(localizeDate(ev.release.releasedAt, locale))}</strong>
                <span>${escapeHtml(ev.daysAgo === 0 ? t.timelineToday : t.timelineDaysAgo(ev.daysAgo))}</span>
              </div>
              <div class="log-main">
                <div class="log-headline">
                  <strong class="log-model-title">${escapeHtml(ev.release.version)}</strong>
                  <span class="log-lab">${escapeHtml(ev.line.company.name)} · ${escapeHtml(localizeLineName(ev.line, locale))}</span>
                  ${ev.release.isCurrent ? `<span class="current-pill">${escapeHtml(t.timelineCurrentChip)}</span>` : ''}
                </div>
                <p class="log-desc">${escapeHtml(desc)}</p>
                ${renderFullModelLinks(ev.line, ev.release, locale)}
              </div>
            </div>
          `;
        })
        .join('');

      return `
        <section class="log-month">
          <h3 class="log-month-title">${escapeHtml(monthTitle)} <span>(${items.length})</span></h3>
          <div class="log-card">${rows}</div>
        </section>
      `;
    })
    .join('');
}

function renderEmptyState(locale: Locale): string {
  const t = UI_STRINGS[locale];
  return `
    <div class="empty-box">
      <h3>${escapeHtml(t.emptyTitle)}</h3>
      <p>${escapeHtml(t.emptyBody)}</p>
      <button type="button" class="reset-btn" data-reset-filters="true">${escapeHtml(t.emptyReset)}</button>
    </div>
  `;
}
