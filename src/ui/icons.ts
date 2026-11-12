const COMPANY_SVG_PATHS: Record<string, string> = {
  openai:
    '<path d="M12 3.2a4.6 4.6 0 0 1 4.1 2.5 4.6 4.6 0 0 1 4.2 6.6 4.6 4.6 0 0 1-2.1 6.2A4.6 4.6 0 0 1 12 20.8a4.6 4.6 0 0 1-4.1-2.5 4.6 4.6 0 0 1-4.2-6.6 4.6 4.6 0 0 1 2.1-6.2A4.6 4.6 0 0 1 12 3.2Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  anthropic:
    '<path d="M8.6 18.5 12 5.5l3.4 13M6.2 18.5 9.8 5.5M14.2 5.5l3.6 13M9.3 14.3h5.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  google:
    '<path d="M12 3.5c.5 4.7 3.8 8 8.5 8.5-4.7.5-8 3.8-8.5 8.5-.5-4.7-3.8-8-8.5-8.5 4.7-.5 8-3.8 8.5-8.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  xai:
    '<path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5M14.5 5.5h4v4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  meta:
    '<path d="M4.2 14.3c0-3.2 2.1-5.8 4.4-5.8 1.8 0 3.1 1.4 4.4 3.5 1.3-2.1 2.6-3.5 4.4-3.5 2.3 0 4.4 2.6 4.4 5.8 0 2.1-1.2 3.5-2.8 3.5-1.6 0-2.8-1.2-4.2-3.5l-.8-1.3-.8 1.3c-1.4 2.3-2.6 3.5-4.2 3.5-1.6 0-2.8-1.4-2.8-3.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  deepseek:
    '<path d="M4.5 13.2c1.8-4.4 6.2-6.7 10.9-5.4 2.4.7 4.1 2.4 4.6 4.5-1.7.4-3.1 1.6-3.6 3.3-1.9 1.9-5.1 2.5-8.1 1.4-1.8-.7-3.1-2-3.8-3.8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="14.2" cy="10.8" r="1.1" fill="currentColor"/>',
  alibaba:
    '<rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.5 9.5h5v5h-5zM14.5 14.5l3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  mistral:
    '<path d="M5 18V6h3l4 5 4-5h3v12M5 14h3M16 14h3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  moonshot:
    '<path d="M15.8 4.5a7.8 7.8 0 1 0 3.7 14.2A6.6 6.6 0 0 1 15.8 4.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  zai:
    '<path d="M6 6.5h12L6 17.5h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  minimax:
    '<path d="M4.5 16.5V7.5l3.8 5 3.7-5 3.7 5 3.8-5v9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  microsoft:
    '<rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="13" y="4.5" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="4.5" y="13" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="13" y="13" width="6.5" height="6.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  nvidia:
    '<path d="M4.5 12c2.2-3.8 5.4-5.5 9-5.5 3.4 0 5.6 1.8 6 5.5-.4 3.7-2.6 5.5-6 5.5-3.6 0-6.8-1.7-9-5.5Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="13" cy="12" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  cohere:
    '<circle cx="9" cy="9.5" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="15.5" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 16.5c1.5-1.8 3.6-2.5 6-2.5s4.5.7 5.5 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
};

export function renderCompanyMark(companyId: string, accent: string, size = 18): string {
  const inner =
    COMPANY_SVG_PATHS[companyId] ??
    '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/>';
  return `<span class="company-mark" style="--company-accent:${accent}" aria-hidden="true"><svg width="${size}" height="${size}" viewBox="0 0 24 24">${inner}</svg></span>`;
}

export const UI_ICONS = {
  search:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  cards:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.8"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.8"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.8"/><rect x="13" y="13" width="7.5" height="7.5" rx="1.8"/></svg>',
  matrix:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  timeline:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 4v16M6 8h9M6 14h13M6 19h6"/><circle cx="16.5" cy="8" r="1.8"/><circle cx="19.5" cy="14" r="1.8"/><circle cx="13.5" cy="19" r="1.8"/></svg>',
  plus:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  sun:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></svg>',
  moon:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.2 14.8A8.2 8.2 0 0 1 9.2 3.8a8.3 8.3 0 1 0 11 11Z"/></svg>',
  external:
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9.5 9.5M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>',
  close:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  clock:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>',
  copy:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
};
