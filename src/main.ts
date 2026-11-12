import './styles.css';
import baseCatalogJson from './data/models.json';
import {
  computeCatalogMetrics,
  getTodayLocalIso,
  ModelAccess,
  ModelCatalog,
  ModelCategory,
  parseUtcDayNumber,
} from './lib/cadence';
import {
  detectInitialLocale,
  Locale,
  localizeDate,
  persistLocale,
  UI_STRINGS,
} from './lib/i18n';
import { UI_ICONS } from './ui/icons';
import {
  escapeHtml,
  filterAndSortLines,
  FilterState,
  renderCardsView,
  renderCompanyTabs,
  renderMatrixView,
  renderTelemetryStrip,
  renderTimelineView,
  SortMode,
  StatusFilter,
  ViewMode,
} from './ui/render';

function readInitialUrlState(): {
  filters: FilterState;
  asOfIso: string;
} {
  const params = new URLSearchParams(window.location.search);
  const rawAsOf = params.get('asOf');
  let asOfIso = getTodayLocalIso();
  if (rawAsOf) {
    try {
      parseUtcDayNumber(rawAsOf);
      asOfIso = rawAsOf;
    } catch {
      // Fallback to today's local date
    }
  }

  const viewParam = params.get('view');
  const view: ViewMode =
    viewParam === 'matrix' || viewParam === 'timeline' ? viewParam : 'cards';

  const sortParam = params.get('sort');
  const sort: SortMode =
    sortParam === 'newest' ||
    sortParam === 'overdue' ||
    sortParam === 'oldest' ||
    sortParam === 'fastest'
      ? sortParam
      : 'company';

  const statusParam = params.get('status');
  const statusFilter: StatusFilter =
    statusParam === 'just-released' ||
    statusParam === 'safe' ||
    statusParam === 'fresh-mid' ||
    statusParam === 'watch' ||
    statusParam === 'overdue' ||
    statusParam === 'consolidated'
      ? statusParam
      : 'all';

  const categoryParam = params.get('category');
  const category: 'all' | ModelCategory =
    categoryParam === 'frontier' ||
    categoryParam === 'workhorse' ||
    categoryParam === 'fast' ||
    categoryParam === 'coding' ||
    categoryParam === 'multimodal'
      ? categoryParam
      : 'all';

  const accessParam = params.get('access');
  const access: 'all' | ModelAccess =
    accessParam === 'proprietary' || accessParam === 'open-weights' ? accessParam : 'all';

  return {
    filters: {
      query: params.get('q') ?? '',
      companyId: params.get('company') ?? 'all',
      category,
      access,
      statusFilter,
      sort,
      view,
      hideConsolidated: params.get('hideConsolidated') === '1',
    },
    asOfIso,
  };
}

function syncUrlState(filters: FilterState, asOfIso: string, locale: Locale): void {
  const params = new URLSearchParams();
  if (locale !== 'en') params.set('lang', locale);
  if (filters.companyId !== 'all') params.set('company', filters.companyId);
  if (filters.category !== 'all') params.set('category', filters.category);
  if (filters.access !== 'all') params.set('access', filters.access);
  if (filters.statusFilter !== 'all') params.set('status', filters.statusFilter);
  if (filters.sort !== 'company') params.set('sort', filters.sort);
  if (filters.view !== 'cards') params.set('view', filters.view);
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.hideConsolidated) params.set('hideConsolidated', '1');
  if (asOfIso !== getTodayLocalIso()) params.set('asOf', asOfIso);

  const qs = params.toString();
  const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
  window.history.replaceState(null, '', nextUrl);
}

const init = readInitialUrlState();
let filters: FilterState = init.filters;
let locale: Locale = detectInitialLocale();
persistLocale(locale);

const asOfIso = init.asOfIso;
const expandedLineIds = new Set<string>();

const metrics = computeCatalogMetrics(baseCatalogJson as ModelCatalog, asOfIso);
const appRoot = document.querySelector<HTMLDivElement>('#app')!;

function renderShell(): void {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const t = UI_STRINGS[locale];

  appRoot.innerHTML = `
    <div class="page-wrap">
      <header class="masthead">
        <div class="masthead-brand">
          <div class="brand-line">
            <a href="https://paul.mou.dev/" class="site-crumb" title="paul.mou.dev">~/moomou</a>
            <span class="crumb-slash">/</span>
            <span class="site-slug">modelwatch</span>
          </div>
          <h1 class="masthead-heading">${escapeHtml(t.siteTitle)}</h1>
          <p class="masthead-lead">${escapeHtml(t.siteSubtitle)}</p>
        </div>

        <div class="masthead-controls">
          <div class="seg-control" role="tablist" aria-label="View mode">
            <button type="button" class="seg-item" data-view="cards">${escapeHtml(t.viewCards)}</button>
            <button type="button" class="seg-item" data-view="matrix">${escapeHtml(t.viewTable)}</button>
            <button type="button" class="seg-item" data-view="timeline">${escapeHtml(t.viewTimeline)}</button>
          </div>

          <div class="seg-control" role="group" aria-label="Language">
            <button type="button" class="seg-item ${locale === 'en' ? 'is-active' : ''}" data-lang="en">EN</button>
            <button type="button" class="seg-item ${locale === 'zh' ? 'is-active' : ''}" data-lang="zh">中文</button>
          </div>

          <button
            type="button"
            class="theme-btn"
            id="theme-toggle-btn"
            aria-label="Toggle light or dark reading theme"
          >
            ${isDark ? UI_ICONS.sun : UI_ICONS.moon}
          </button>
        </div>
      </header>

      <div id="telemetry-root"></div>

      <section class="filter-bar" aria-label="Filter and sort">
        <div id="company-tabs-root"></div>

        <div class="filter-bar-right">
          <div class="search-field">
            <span class="search-field-icon">${UI_ICONS.search}</span>
            <input
              type="search"
              id="search-input"
              placeholder="${escapeHtml(t.searchPlaceholder)}"
              value="${escapeHtml(filters.query)}"
              autocomplete="off"
            />
          </div>

          <select id="sort-select" class="clean-select" aria-label="Sort order">
            <option value="company">${escapeHtml(t.sortByCompany)}</option>
            <option value="overdue">${escapeHtml(t.sortByRefreshDue)}</option>
            <option value="newest">${escapeHtml(t.sortByNewest)}</option>
            <option value="oldest">${escapeHtml(t.sortByOldest)}</option>
            <option value="fastest">${escapeHtml(t.sortByFastest)}</option>
          </select>
        </div>
      </section>

      <main id="results-root"></main>

      <footer class="site-footer">
        <p>
          ${escapeHtml(
            t.footerMethodology(
              localizeDate(metrics.summary.asOfDate, locale),
              metrics.summary.totalReleases,
              metrics.summary.totalCompanies
            )
          )}
        </p>
        <div class="footer-links">
          <a href="https://paul.mou.dev/">paul.mou.dev</a>
          <span>·</span>
          <a href="https://github.com/moomou/modelwatch" target="_blank" rel="noopener noreferrer">${escapeHtml(t.footerSourceLabel)}</a>
        </div>
      </footer>
    </div>
  `;
}

function updateDynamicRegions(): void {
  const { lines, summary, companies } = metrics;
  const visibleLines = filterAndSortLines(lines, filters);

  document.querySelector<HTMLElement>('#telemetry-root')!.innerHTML = renderTelemetryStrip(
    summary,
    filters,
    locale
  );

  document.querySelector<HTMLElement>('#company-tabs-root')!.innerHTML = renderCompanyTabs(
    companies,
    filters.companyId,
    locale
  );

  (document.querySelector<HTMLSelectElement>('#sort-select')!).value = filters.sort;

  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
    btn.classList.toggle('is-active', btn.dataset.view === filters.view);
  }
  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
    btn.classList.toggle('is-active', btn.dataset.lang === locale);
  }

  const resultsRoot = document.querySelector<HTMLElement>('#results-root')!;
  if (filters.view === 'matrix') {
    resultsRoot.innerHTML = renderMatrixView(visibleLines, locale);
  } else if (filters.view === 'timeline') {
    resultsRoot.innerHTML = renderTimelineView(visibleLines, asOfIso, locale);
  } else {
    resultsRoot.innerHTML = renderCardsView(
      visibleLines,
      companies,
      filters,
      expandedLineIds,
      locale
    );
  }

  syncUrlState(filters, asOfIso, locale);
}

renderShell();
updateDynamicRegions();

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  if (target.closest('#theme-toggle-btn')) {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('modelwatch-theme-v3', next);
    } catch {
      // ignore
    }
    const btn = document.querySelector<HTMLButtonElement>('#theme-toggle-btn')!;
    btn.innerHTML = next === 'dark' ? UI_ICONS.sun : UI_ICONS.moon;
    return;
  }

  const langBtn = target.closest<HTMLElement>('[data-lang]');
  if (langBtn) {
    const nextLang = (langBtn.dataset.lang as Locale) ?? 'en';
    if (nextLang !== locale) {
      locale = nextLang;
      persistLocale(locale);
      renderShell();
      updateDynamicRegions();
    }
    return;
  }

  const statusBtn = target.closest<HTMLElement>('[data-status-toggle]');
  if (statusBtn) {
    const next = (statusBtn.dataset.statusToggle ?? 'all') as StatusFilter;
    filters.statusFilter = filters.statusFilter === next && next !== 'all' ? 'all' : next;
    updateDynamicRegions();
    return;
  }

  const expandBtn = target.closest<HTMLElement>('[data-toggle-expand]');
  if (expandBtn) {
    const id = expandBtn.dataset.toggleExpand ?? '';
    if (expandedLineIds.has(id)) {
      expandedLineIds.delete(id);
    } else {
      expandedLineIds.add(id);
    }
    updateDynamicRegions();
    return;
  }

  const companyBtn = target.closest<HTMLElement>('[data-company]');
  if (companyBtn) {
    const cid = companyBtn.dataset.company ?? 'all';
    filters.companyId = filters.companyId === cid && cid !== 'all' ? 'all' : cid;
    updateDynamicRegions();
    return;
  }

  const viewBtn = target.closest<HTMLElement>('[data-view]');
  if (viewBtn) {
    filters.view = (viewBtn.dataset.view as ViewMode) ?? 'cards';
    updateDynamicRegions();
    return;
  }

  if (target.closest('[data-reset-filters]')) {
    filters = {
      query: '',
      companyId: 'all',
      category: 'all',
      access: 'all',
      statusFilter: 'all',
      sort: 'company',
      view: filters.view,
      hideConsolidated: false,
    };
    const searchEl = document.querySelector<HTMLInputElement>('#search-input');
    if (searchEl) searchEl.value = '';
    updateDynamicRegions();
  }
});

document.addEventListener('input', (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.id === 'search-input') {
    filters.query = (target as HTMLInputElement).value;
    updateDynamicRegions();
  }
});

document.addEventListener('change', (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.id === 'sort-select') {
    filters.sort = (target as HTMLSelectElement).value as SortMode;
    updateDynamicRegions();
  }
});

document.addEventListener('keydown', (event) => {
  const activeTag = (document.activeElement?.tagName ?? '').toLowerCase();
  const inInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

  if (event.key === 'Escape' && filters.query) {
    filters.query = '';
    const searchEl = document.querySelector<HTMLInputElement>('#search-input');
    if (searchEl) {
      searchEl.value = '';
      searchEl.blur();
    }
    updateDynamicRegions();
    return;
  }

  if (!inInput && event.key === '/') {
    event.preventDefault();
    document.querySelector<HTMLInputElement>('#search-input')?.focus();
  }
});
