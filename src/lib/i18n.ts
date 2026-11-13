import { CadenceStatus, ComputedModelLine, LineLifecycle } from './cadence';

export type Locale = 'en' | 'zh';

const LOCALE_STORAGE_KEY = 'modelwatch-locale';

export function detectInitialLocale(): Locale {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang === 'zh' || urlLang === 'zh-TW' || urlLang === 'zh-Hant') return 'zh';
    if (urlLang === 'en') return 'en';

    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    // ignore
  }
  return 'en';
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }
  document.documentElement.lang = locale === 'zh' ? 'zh-Hant' : 'en';
}

export const UI_STRINGS = {
  en: {
    sitePath: '~/modelwatch',
    siteTitle: 'AI Model Release Cadence',
    siteSubtitle: 'Days since last release & historical refresh cycles across major AI labs',
    viewCards: 'Cards',
    viewTable: 'Table',
    viewTimeline: 'Timeline',
    allLabs: 'All',
    searchPlaceholder: 'Filter models or labs…',
    sortByCompany: 'Group by Lab',
    sortByRefreshDue: 'Refresh Expected Soonest',
    sortByNewest: 'Newest Releases',
    sortByOldest: 'Longest Since Release',
    sortByFastest: 'Fastest Cycle',
    telemetryTracks: 'tracks',
    telemetryLabs: 'labs',
    telemetryJustReleased: 'released ≤14d',
    telemetryRefreshWatch: 'in / past refresh window',
    telemetryClearFilter: 'Clear filter',
    telemetryVerified: 'Updated',
    daysUnitSingular: 'day',
    daysUnitPlural: 'days',
    daysSinceRelease: 'Current age',
    typicalCycle: 'Typical cycle',
    meanPrefix: 'Mean',
    priorReleases: 'Prior releases',
    daysActiveSub: 'Days active',
    firstReleaseNote: 'First release in track — no prior cycle yet',
    openWeightsTag: 'Open Weights',
    linkReleasePost: 'Release Post',
    linkShortPost: 'Post',
    showFewer: 'Collapse earlier',
    expandMore: (n: number) => `+ ${n} earlier ${n === 1 ? 'release' : 'releases'}`,
    tracksCount: (n: number) => `${n} ${n === 1 ? 'track' : 'tracks'}`,
    tableColLab: 'Lab',
    tableColTrack: 'Model Line',
    tableColModel: 'Current Model & Benchmarks',
    tableColDays: 'Age',
    tableColTypical: 'Typical',
    tableColComparison: 'Age vs. Typical',
    tableColCadence: 'Refresh Stage',
    timelineCurrentChip: 'Current',
    timelineToday: 'Today',
    timelineDaysAgo: (d: number) => `${d}d ago`,
    emptyTitle: 'No matching AI model tracks',
    emptyBody: 'Clear your search filter or select All labs to view every lineage.',
    emptyReset: 'Show All Models',
    footerMethodology: (asOf: string, releases: number, companies: number) =>
      `As of ${asOf} · Typical cycle = rolling median of up to 5 recent intervals per line (${releases} verified releases across ${companies} labs).`,
    footerSourceLabel: 'GitHub',
  },
  zh: {
    sitePath: '~/modelwatch',
    siteTitle: 'AI 模型發佈與更新週期',
    siteSubtitle: '追蹤各大 AI 實驗室模型距今發佈天數與歷史更新節奏',
    viewCards: '卡片',
    viewTable: '總覽表',
    viewTimeline: '時間軸',
    allLabs: '全部',
    searchPlaceholder: '搜尋模型或實驗室…',
    sortByCompany: '依實驗室分組',
    sortByRefreshDue: '最接近更新優先',
    sortByNewest: '最新發佈優先',
    sortByOldest: '最久未更新優先',
    sortByFastest: '更新最頻繁優先',
    telemetryTracks: '條模型線',
    telemetryLabs: '間實驗室',
    telemetryJustReleased: '近 14 天新發佈',
    telemetryRefreshWatch: '進入或超過更新週期',
    telemetryClearFilter: '清除篩選',
    telemetryVerified: '更新於',
    daysUnitSingular: '天',
    daysUnitPlural: '天',
    daysSinceRelease: '距今發佈',
    typicalCycle: '慣例週期',
    meanPrefix: '平均',
    priorReleases: '歷代版本',
    daysActiveSub: '在位天數',
    firstReleaseNote: '此產品線首發版本，尚無歷史週期',
    openWeightsTag: '開源權重',
    linkReleasePost: '官方公告',
    linkShortPost: '公告',
    showFewer: '收合早期版本',
    expandMore: (n: number) => `+ 展開另 ${n} 個早期版本`,
    tracksCount: (n: number) => `${n} 條產品線`,
    tableColLab: '實驗室',
    tableColTrack: '模型產品線',
    tableColModel: '目前版本與評測',
    tableColDays: '發佈天數',
    tableColTypical: '慣例週期',
    tableColComparison: '目前 vs. 慣例',
    tableColCadence: '更新節奏',
    timelineCurrentChip: '目前版本',
    timelineToday: '今日',
    timelineDaysAgo: (d: number) => `${d} 天前`,
    emptyTitle: '找不到符合條件的模型產品線',
    emptyBody: '請清除關鍵字或切換回「全部」實驗室。',
    emptyReset: '顯示全部模型',
    footerMethodology: (asOf: string, releases: number, companies: number) =>
      `統計基準：${asOf} · 慣例週期採各產品線近 5 次版本間隔之中位數，避免單次極端間隔扭曲預期（涵蓋 ${companies} 間實驗室、${releases} 筆官方發佈紀錄）。`,
    footerSourceLabel: 'GitHub',
  },
} as const;

const ZH_TIER_LABELS: Record<string, string> = {
  'Apex Frontier': '頂尖旗艦',
  'Frontier Reasoning': '前沿推理',
  Frontier: '前沿旗艦',
  'Frontier MoE': '前沿 MoE',
  'Open Frontier': '開源前沿',
  'Open Frontier MoE': '開源前沿 MoE',
  'Open Flagship': '開源旗艦',
  'Open Enterprise MoE': '企業級開源 MoE',
  'Balanced Workhorse': '均衡主力',
  'High-Speed Workhorse': '高速主力',
  'Workhorse & Omni': '主力與全模態',
  'Enterprise Workhorse': '企業級主力',
  'Enterprise Agentic': '企業級代理',
  'Fast & Compact': '輕快高效',
  'Fast Reasoning': '高速推理',
  'Fast Open MoE': '輕快開源 MoE',
  'Fast Tier': '高速輕量',
  'Ultra-Low-Cost': '超低成本',
  'Compact Open Weights': '輕量開源權重',
  'Code & Security': '程式與資安',
  'Reasoning & Code': '推理與程式',
  'Dedicated Reasoning': '專用推理',
  'Voice & Live API': '語音與即時互動',
  'Voice & Speech': '語音與對話',
  'Speech & Audio': '語音與音訊',
  'Image & Video Gen': '影像與影片生成',
  'Open Weights': '開源權重',
  'Classic Open Weights': '經典開源權重',
  'Mythos Apex Tier': 'Mythos 頂尖層級',
};

const ZH_LINE_NAMES: Record<string, string> = {
  'openai-flagship': 'GPT 旗艦系列 (Astra / Pro)',
  'openai-sol': 'GPT Sol 推理系列',
  'openai-terra': 'GPT Terra 均衡系列',
  'openai-luna': 'GPT Luna / Mini 輕快系列',
  'openai-codex-cyber': 'GPT Codex 與 Cyber 專精系列',
  'openai-realtime': 'GPT Realtime 即時語音',
  'openai-oss': 'GPT-OSS 開源系列',
  'anthropic-fable': 'Claude Fable / Mythos 頂尖系列',
  'anthropic-opus': 'Claude Opus 旗艦系列',
  'anthropic-sonnet': 'Claude Sonnet 主力系列',
  'anthropic-haiku': 'Claude Haiku 輕快系列',
  'google-gemini-pro': 'Gemini 旗艦系列 (Pro / Argon / Carbon)',
  'google-gemini-flash': 'Gemini Flash / Hydrogen 高速主力系列',
  'google-gemini-flash-lite': 'Gemini Flash-Lite 輕量系列',
  'google-gemma': 'Gemma 開源系列',
  'google-nano-banana': 'Nano Banana 與 Omni 影音生成',
  'xai-grok-flagship': 'Grok 旗艦系列',
  'xai-grok-fast': 'Grok Fast / Mini 系列',
  'xai-grok-voice': 'Grok Voice 語音系列',
  'meta-muse-frontier': 'Muse 旗艦系列 (Spark / Wonder / Ember)',
  'meta-muse-open': 'Muse Open 開源系列',
  'meta-llama': 'Llama 經典開源系列',
  'deepseek-v-pro': 'DeepSeek V 系列旗艦',
  'deepseek-v-flash': 'DeepSeek V 系列 Flash',
  'deepseek-r-series': 'DeepSeek R 系列推理',
  'qwen-max': 'Qwen Max 旗艦系列',
  'qwen-open': 'Qwen 開源權重系列',
  'qwen-plus-flash': 'Qwen Plus 與 Flash 系列',
  'mistral-large': 'Mistral Large 旗艦系列',
  'mistral-workhorse': 'Mistral Medium 與 Small 系列',
  'mistral-voxtral': 'Voxtral 語音系列',
  'moonshot-kimi': 'Kimi K 系列',
  'zai-glm-flagship': 'GLM 旗艦系列',
  'zai-glm-flash': 'GLM Flash 與 Turbo 系列',
  'minimax-m': 'MiniMax M 系列',
  'microsoft-mai': 'Microsoft MAI 系列',
  'microsoft-phi': 'Microsoft Phi 輕量開源系列',
  'nvidia-nemotron': 'NVIDIA Nemotron 開源系列',
  'cohere-command': 'Cohere Command 企業系列',
};

const ZH_LIFECYCLE_NOTES: Record<string, string> = {
  'xai-grok-fast':
    '獨立 Fast 型號已於 2026 年 5 月退役，推理強度分級已直接整合至 Grok 4.6+ 主線模型。',
  'meta-llama':
    'Meta 於 2026 年將開源重心轉向新一代 Muse Open 系列（Muse Glimmer 與 Muse Spark Open）。',
  'deepseek-r-series':
    '深度思考模式已直接整合至 DeepSeek V3.1、V3.2 與 V4 Pro/Flash，目前尚未單獨發佈 R2。',
  'microsoft-phi':
    '自 2025 年 4 月後尚未推出 Phi-5，微軟重心轉向 Fara 電腦操作代理與 MAI 自研系列。',
};

const ZH_CURRENT_HIGHLIGHTS: Record<string, string> = {
  'openai-flagship': '新一代頂尖旗艦模型，全面提升科學推理、複雜規劃與對齊能力。',
  'openai-sol': '針對大型程式碼庫與高強度專業工作流強化的推理主力版本。',
  'openai-terra': '升級視覺推理、精準電腦操作（Computer Use）與自然寫作能力。',
  'openai-luna': '導入 GPT-6 世代訓練技術的高速、低成本輕量首選。',
  'openai-codex-cyber': 'GPT-6 世代防禦型資安審計與程式碼漏洞修補專精模型。',
  'openai-realtime': '新一代低延遲全雙工語音與即時多模態 API 模型。',
  'openai-oss': 'OpenAI 自 GPT-2 以來首度發佈的 Apache 2.0 開源權重推理模型。',
  'anthropic-fable': '輸出速度提升高達 30%，同時降低每百萬 token 計費成本。',
  'anthropic-opus': '在多數任務追平 Fable 5.1 水準，典型工作負載成本降低約 40%。',
  'anthropic-sonnet': '5.5 世代高性價比主力，強化程式開發、工具呼叫與電腦操作。',
  'anthropic-haiku': '5.5 世代極速輕量模型，專為平行子代理與即時互動打造。',
  'google-gemini-pro': 'DeepMind 最強推理旗艦正式全面開放（GA），專攻長程代理與科學研究。',
  'google-gemini-flash': '具備 1M 統一上下文與長輸出、支援四段推理深度（含 xhigh），正式接替 Gemini 3.8 Flash 成為高速代理主力。',
  'google-gemini-flash-lite': '超高吞吐量、極低單價預設模型，承接原 2.5 Flash 流量。',
  'google-gemma': '單張 GPU 即可部署的 12B 統一多模態開源架構。',
  'google-nano-banana': '支援 15 秒影片生成與對話式影片編輯，輸出成本降低 30%。',
  'xai-grok-flagship': 'xAI 目前最新旗艦，顯著強化軟體工程與代理工具呼叫準確度。',
  'xai-grok-voice': '第三代高擬真多模態即時語音對話架構。',
  'meta-muse-frontier': 'Meta AI Research 最新發佈的前沿旗艦模型。',
  'meta-muse-open': '於 Hugging Face 開源的 816B（42B 激活）稀疏 MoE 旗艦模型。',
  'deepseek-v-pro': '完整開放權重的 DeepSeek V4 Pro 正式版旗艦檢查點。',
  'deepseek-v-flash': 'V4.1 世代強化學習升級版（1017），兼顧程式碼品質、執行速度與輸出效率。',
  'qwen-max': '通義千問 Qwen4 世代首發多模態旗艦預覽版，整合圖文與影片理解、深度推理與複雜代理任務執行。',
  'qwen-open': '源自 Qwen3.8 世代蒸餾的高效能 27B 開源權重模型。',
  'qwen-plus-flash': '支援文字、視覺、音訊與影片即時理解的全模態 Flash 模型。',
  'mistral-large': '高達 1 兆參數（52B 激活）的稀疏 MoE 旗艦，並開放模型權重。',
  'mistral-workhorse': '128B 企業主力模型，與 Vibe 遠端程式代理同步推出。',
  'mistral-voxtral': '整合轉錄、即時語音與自然語音合成的第三代音訊套件。',
  'moonshot-kimi': '名列開源榜首的 K3.1 Pro 代理與程式開發旗艦權重模型。',
  'zai-glm-flagship': '目前 GLM-5.x 系列最新程式開發與深度推理旗艦。',
  'zai-glm-flash': '搭配 GLM-5.3 推出的高吞吐量輕快版模型。',
  'minimax-m': '正式版發佈，以 Flash 等級定價提供前沿代理執行速度。',
  'microsoft-mai': '專為高精準度結構化決策任務設計的輕量模型。',
  'nvidia-nemotron': '120B-A12B 視覺語言 Super 模型與 74B-A9B Bolt 高速模型。',
  'cohere-command': '採用 Apache 2.0 授權的 218B 稀疏 MoE，支援 48 種語言與視覺輸入。',
};

export function localizeTierLabel(tierLabel: string, locale: Locale): string {
  if (locale === 'en') return tierLabel;
  return ZH_TIER_LABELS[tierLabel] ?? tierLabel;
}

export function localizeLineName(line: ComputedModelLine, locale: Locale): string {
  if (locale === 'en') return line.name;
  return ZH_LINE_NAMES[line.id] ?? line.name;
}

export function localizeCurrentHighlights(line: ComputedModelLine, locale: Locale): string {
  if (locale === 'en') {
    return line.lifecycleNote ?? line.currentRelease.highlights;
  }
  if (line.lifecycleNote && ZH_LIFECYCLE_NOTES[line.id]) {
    return ZH_LIFECYCLE_NOTES[line.id];
  }
  return ZH_CURRENT_HIGHLIGHTS[line.id] ?? line.lifecycleNote ?? line.currentRelease.highlights;
}

export function localizeStatus(
  status: CadenceStatus,
  lifecycle: LineLifecycle,
  daysSinceRelease: number,
  typicalCycleDays: number | null,
  locale: Locale
): { label: string; expectation: string } {
  if (locale === 'en') {
    // Use precomputed English strings on ComputedModelLine when available; fallback here
    if (lifecycle === 'consolidated') {
      return { label: 'Superseded', expectation: 'Track succeeded' };
    }
    if (daysSinceRelease <= 14) {
      return {
        label: 'Just Released',
        expectation: typicalCycleDays !== null ? `Typical ~${typicalCycleDays}d` : 'Newly launched',
      };
    }
    if (typicalCycleDays === null) {
      return { label: 'First Release', expectation: 'No prior cycle' };
    }
    const delta = daysSinceRelease - typicalCycleDays;
    if (status === 'fresh') {
      return { label: 'Early Cycle', expectation: `~${Math.abs(delta)}d to refresh` };
    }
    if (status === 'mid-cycle') {
      return { label: 'Mid-Cycle', expectation: `~${Math.abs(delta)}d to refresh` };
    }
    if (status === 'due-soon') {
      const exp =
        delta < 0
          ? `~${Math.abs(delta)}d from ~${typicalCycleDays}d`
          : delta === 0
            ? `At ~${typicalCycleDays}d mark`
            : `+${delta}d past ~${typicalCycleDays}d`;
      return { label: 'Refresh Window', expectation: exp };
    }
    return {
      label: 'Past Typical Cycle',
      expectation: `+${delta}d past ~${typicalCycleDays}d`,
    };
  }

  // Traditional Chinese
  if (lifecycle === 'consolidated') {
    return { label: '已整合', expectation: '已由新系列接替' };
  }
  if (daysSinceRelease <= 14) {
    return {
      label: '剛發佈',
      expectation: typicalCycleDays !== null ? `慣例週期約 ${typicalCycleDays} 天` : '近期全新推出',
    };
  }
  if (typicalCycleDays === null) {
    return { label: '首發世代', expectation: '尚無歷史週期' };
  }

  const delta = daysSinceRelease - typicalCycleDays;
  if (status === 'fresh') {
    return { label: '週期初期', expectation: `距慣例更新約 ${Math.abs(delta)} 天` };
  }
  if (status === 'mid-cycle') {
    return { label: '週期中段', expectation: `距慣例更新約 ${Math.abs(delta)} 天` };
  }
  if (status === 'due-soon') {
    const exp =
      delta < 0
        ? `距 ~${typicalCycleDays} 天週期剩約 ${Math.abs(delta)} 天`
        : delta === 0
          ? `正處於 ~${typicalCycleDays} 天慣例點`
          : `已超過 ~${typicalCycleDays} 天慣例點 ${delta} 天`;
    return { label: '進入更新窗口', expectation: exp };
  }
  return {
    label: '超過慣例週期',
    expectation: `已超過 ~${typicalCycleDays} 天週期 ${delta} 天`,
  };
}

export function localizeDate(isoDate: string, locale: Locale): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (locale === 'zh') {
    return `${y}年${m}月${d}日`;
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}, ${y}`;
}

export function localizeMonthYear(isoDate: string, locale: Locale): string {
  const [y, m] = isoDate.split('-');
  if (locale === 'zh') {
    return `${y}.${m}`;
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m) - 1]} ${y}`;
}
