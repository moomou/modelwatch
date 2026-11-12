import { ComputedModelLine, ComputedRelease, RawRelease } from './cadence';

export interface ExternalModelLinks {
  officialUrl: string;
  artificialAnalysisUrl: string;
  arenaUrl: string;
}

/**
 * Verified model-level slugs on https://artificialanalysis.ai/models/<slug>
 * Checked against https://artificialanalysis.ai/leaderboards/models (Nov 2026).
 */
const VERIFIED_AA_MODEL_SLUGS: Record<string, string> = {
  // OpenAI
  'gpt-6 astra': 'gpt-6-astra',
  'gpt-6.1 sol': 'gpt-6-1-sol',
  'gpt-6 sol': 'gpt-6-sol',
  'gpt-6.1 terra': 'gpt-6-1-terra',
  'gpt-6 luna': 'gpt-6-luna',
  'gpt-5.6 sol': 'gpt-5-6-sol',
  'gpt-5.6 terra': 'gpt-5-6-terra',
  'gpt-5.6 luna': 'gpt-5-6-luna',
  'gpt-5.5 pro': 'gpt-5-5-pro',
  'gpt-5.5': 'gpt-5-5',
  'gpt-5.4 pro': 'gpt-5-4-pro',
  'gpt-5.4': 'gpt-5-4',
  'gpt-5.2': 'gpt-5-2',
  'gpt-5.1': 'gpt-5-1',
  'gpt-5': 'gpt-5',
  'gpt-5 thinking': 'gpt-5',
  'gpt-oss 120b & 20b': 'gpt-oss-120b',
  o3: 'o3',
  'o4-mini': 'o4-mini',
  'o3-mini': 'o3-mini',
  o1: 'o1',
  'gpt-4.1': 'gpt-4-1',
  'gpt-4.5': 'gpt-4-5',
  'gpt-4o': 'gpt-4o',
  'gpt-4o mini': 'gpt-4o-mini',

  // Anthropic
  'claude fable 5.2 & mythos 5.2': 'claude-fable-5-2',
  'claude fable 5.1 & mythos 5.1': 'claude-fable-5-1',
  'claude fable 5 & mythos 5': 'claude-fable-5',
  'claude opus 5.5': 'claude-opus-5-5',
  'claude opus 5': 'claude-opus-5',
  'claude opus 4.8': 'claude-opus-4-8',
  'claude opus 4.7': 'claude-opus-4-7',
  'claude opus 4.6': 'claude-opus-4-6',
  'claude opus 4.5': 'claude-opus-4-5',
  'claude opus 4.1': 'claude-4-1-opus',
  'claude opus 4': 'claude-4-opus',
  'claude 3 opus': 'claude-3-opus',
  'claude sonnet 5.5': 'claude-sonnet-5-5',
  'claude sonnet 5': 'claude-sonnet-5',
  'claude sonnet 4.6': 'claude-sonnet-4-6',
  'claude sonnet 4.5': 'claude-sonnet-4-5',
  'claude sonnet 4': 'claude-4-sonnet',
  'claude 3.7 sonnet': 'claude-3-7-sonnet',
  'claude 3.5 sonnet (v2)': 'claude-3-5-sonnet',
  'claude 3.5 sonnet': 'claude-3-5-sonnet',
  'claude haiku 5.5': 'claude-haiku-5-5',
  'claude haiku 4.5': 'claude-4-5-haiku',
  'claude 3.5 haiku': 'claude-3-5-haiku',

  // Google DeepMind
  'gemini 4 carbon': 'gemini-4-carbon',
  'gemini 4 argon': 'gemini-4-argon',
  'gemini 3.1 pro': 'gemini-3-1-pro',
  'gemini 3 pro': 'gemini-3-pro',
  'gemini 2.5 pro': 'gemini-2-5-pro',
  'gemini 1.5 pro': 'gemini-1-5-pro',
  'gemini 3.8 flash': 'gemini-3-8-flash',
  'gemini 3.7 flash': 'gemini-3-7-flash',
  'gemini 3.6 flash': 'gemini-3-6-flash',
  'gemini 3.5 flash': 'gemini-3-5-flash',
  'gemini 3 flash': 'gemini-3-flash',
  'gemini 2.5 flash': 'gemini-2-5-flash',
  'gemini 2.0 flash': 'gemini-2-0-flash',
  'gemini 3.5 flash-lite': 'gemini-3-5-flash-lite',
  'gemini 3.1 flash-lite': 'gemini-3-1-flash-lite',
  'gemini 2.5 flash-lite': 'gemini-2-5-flash-lite',
  'gemma 4 12b unified': 'gemma-4-12b-non-reasoning',
  'gemma 4 (e2b–31b)': 'gemma-4-31b',
  'gemma 3 (1b–27b)': 'gemma-3-27b',

  // xAI
  'grok 4.7': 'grok-4-7',
  'grok 4.6': 'grok-4-6',
  'grok 4.5': 'grok-4-5',
  'grok 4.3': 'grok-4-3',
  'grok 4.20': 'grok-4-20',
  'grok 4.1': 'grok-4-1',
  'grok 4': 'grok-4',
  'grok 3': 'grok-3',
  'grok 4.1 fast': 'grok-4-1-fast',
  'grok 4 fast': 'grok-4-fast',
  'grok 3 mini': 'grok-3-mini',

  // Meta
  'muse ember': 'muse-ember',
  'muse wonder': 'muse-wonder',
  'muse spark open (816b-a42b)': 'muse-spark-open',
  'muse glimmer 30b': 'muse-glimmer',
  'llama 4 maverick & scout': 'llama-4-maverick',
  'llama 3.3 70b': 'llama-3-3-instruct-70b',
  'llama 3.1 (8b, 70b & 405b)': 'llama-3-1-instruct-405b',

  // DeepSeek
  'deepseek-v4 pro (0813)': 'deepseek-v4-pro',
  'deepseek-v3.2': 'deepseek-v3-2',
  'deepseek-v3.1': 'deepseek-v3-1',
  'deepseek-v3-0324': 'deepseek-v3-0324',
  'deepseek-v3': 'deepseek-v3',
  'deepseek-v4.1 flash (1017)': 'deepseek-v4-1-flash-1017',
  'deepseek-r1-0528': 'deepseek-r1-0528',
  'deepseek-r1': 'deepseek-r1',

  // Alibaba Qwen
  'qwen3.8 max (2.4t)': 'qwen3-8-max',
  'qwen3.8-27b': 'qwen3-8-27b',
  'qwen3.5 397b-a17b': 'qwen3-5-397b-a17b',
  'qwen3 235b-a22b': 'qwen3-235b-a22b-instruct',
  'qwen3.8-flash-next': 'qwen3-8-flash-next',

  // Mistral
  'mistral large 4 (1t-a52b)': 'mistral-large-4',
  'mistral large 3': 'mistral-large-3',
  'mistral large 2': 'mistral-large-2',
  'mistral medium 3.5 (128b)': 'mistral-medium-3-5',
  'mistral small 4': 'mistral-small-4',
  'mistral medium 3': 'mistral-medium-3',

  // Moonshot, Z.AI, MiniMax, Microsoft, NVIDIA, Cohere
  'kimi k3.1 pro': 'kimi-k3-1-pro',
  'kimi k3': 'kimi-k3',
  'kimi k2.5': 'kimi-k2-5',
  'kimi k2': 'kimi-k2',
  'glm-5.3': 'glm-5-3',
  'glm-5.3-flash': 'glm-5-3-flash',
  'minimax m3.1 flash': 'minimax-m3-1-flash',
  'minimax m3': 'minimax-m3',
  'phi-4-multimodal': 'phi-4-multimodal',
  'nemotron 3.5 super vl & bolt': 'nemotron-3-5-super-vl',
  'nemotron 3 ultra 550b': 'nvidia-nemotron-3-ultra-550b-a55b',
  'nemotron 3 nano 30b': 'nvidia-nemotron-3-nano-30b-a3b',
  'command a+ (218b moe)': 'command-a-plus',
  'command a (111b)': 'command-a',
};

/**
 * HTTP-200 verified provider overview pages on Artificial Analysis.
 */
const VERIFIED_AA_PROVIDER_URLS: Record<string, string> = {
  openai: 'https://artificialanalysis.ai/providers/openai',
  anthropic: 'https://artificialanalysis.ai/providers/anthropic',
  google: 'https://artificialanalysis.ai/providers/google',
  xai: 'https://artificialanalysis.ai/providers/xai',
  meta: 'https://artificialanalysis.ai/providers/meta',
  deepseek: 'https://artificialanalysis.ai/providers/deepseek',
  alibaba: 'https://artificialanalysis.ai/providers/alibaba_cloud',
  mistral: 'https://artificialanalysis.ai/providers/mistral',
  moonshot: 'https://artificialanalysis.ai/providers/kimi',
  zai: 'https://artificialanalysis.ai/providers/zai',
  minimax: 'https://artificialanalysis.ai/providers/minimax',
  microsoft: 'https://artificialanalysis.ai/providers/azure',
  nvidia: 'https://artificialanalysis.ai/leaderboards/models',
  cohere: 'https://artificialanalysis.ai/providers/cohere',
};

export function resolveModelLinks(
  line: Pick<ComputedModelLine, 'id' | 'category' | 'company' | 'aaUrl' | 'arenaUrl'>,
  release: Pick<RawRelease | ComputedRelease, 'version' | 'sourceUrl' | 'aaUrl' | 'arenaUrl'>
): ExternalModelLinks {
  const versionKey = release.version.trim().toLowerCase();

  let artificialAnalysisUrl = release.aaUrl ?? '';
  if (!artificialAnalysisUrl) {
    const slug = VERIFIED_AA_MODEL_SLUGS[versionKey];
    if (slug) {
      artificialAnalysisUrl = `https://artificialanalysis.ai/models/${slug}`;
    } else if (line.aaUrl) {
      artificialAnalysisUrl = line.aaUrl;
    } else if (line.id === 'google-nano-banana') {
      artificialAnalysisUrl = 'https://artificialanalysis.ai/image/models';
    } else if (line.id === 'openai-realtime' || line.id === 'xai-grok-voice') {
      artificialAnalysisUrl = 'https://artificialanalysis.ai/speech-to-speech';
    } else if (line.id === 'mistral-voxtral') {
      artificialAnalysisUrl = 'https://artificialanalysis.ai/speech-to-text/streaming';
    } else {
      artificialAnalysisUrl =
        VERIFIED_AA_PROVIDER_URLS[line.company.id] ??
        'https://artificialanalysis.ai/leaderboards/models';
    }
  }

  let arenaUrl = release.arenaUrl ?? line.arenaUrl ?? '';
  if (!arenaUrl) {
    if (line.id === 'google-nano-banana') {
      arenaUrl = versionKey.includes('omni')
        ? 'https://arena.ai/leaderboard/text-to-video'
        : 'https://arena.ai/leaderboard/image-edit';
    } else if (line.category === 'coding') {
      arenaUrl = 'https://arena.ai/leaderboard/code';
    } else if (line.category === 'multimodal') {
      arenaUrl = 'https://arena.ai/leaderboard';
    } else {
      arenaUrl = 'https://arena.ai/leaderboard/text';
    }
  }

  return {
    officialUrl: release.sourceUrl,
    artificialAnalysisUrl,
    arenaUrl,
  };
}
