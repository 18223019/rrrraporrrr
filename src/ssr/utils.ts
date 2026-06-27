import type {
  Fetcher,
  Request as CfRequest,
} from '@cloudflare/workers-types';
export const CANARY_CONFIG = {
  queryParam: 'use',
  queryValue: 'pages',
  cookieName: 'rapor_canary',
  cookieValue: 'v1',
  headerName: 'x-rapor-canary',
};

export type CanaryEnv = {
  RENDER_MODE?: string;
};

export type AssetsEnv = {
  ASSETS: Fetcher;
};

export type ViteManifest = Record<
  string,
  {
    file: string;
    css?: string[];
    isEntry?: boolean;
    imports?: string[];
  }
>;

export type SSRClientAssetRefs = {
  moduleHref: string;
  styleHrefs: string[];
};

let manifestCache: ViteManifest | null = null;

export function parseCookies(header: string | null | undefined): Record<string, string> {
  if (!header) return {};

  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, pair) => {
      const [name, ...rest] = pair.split('=');
      if (!name) return acc;
      const value = rest.join('=');
      acc[name] = decodeURIComponent(value ?? '');
      return acc;
    }, {});
}

export function isCanaryRequest(request: CfRequest): boolean {
  const url = new URL(request.url);
  const queryOverride = url.searchParams.get(CANARY_CONFIG.queryParam);
  if (queryOverride && queryOverride.toLowerCase() === CANARY_CONFIG.queryValue) {
    return true;
  }

  const headerOverride = request.headers.get(CANARY_CONFIG.headerName);
  if (headerOverride && headerOverride.toLowerCase() === 'true') {
    return true;
  }

  const cookies = parseCookies(request.headers.get('cookie'));
  return cookies[CANARY_CONFIG.cookieName] === CANARY_CONFIG.cookieValue;
}

export function shouldServeSSR(request: CfRequest, env: CanaryEnv): boolean {
  const mode = env.RENDER_MODE ? env.RENDER_MODE.toLowerCase() : 'csr';

  if (mode === 'isr') {
    return true;
  }

  if (mode === 'ssr') {
    return isCanaryRequest(request);
  }

  return false;
}

export function resetManifestCache() {
  manifestCache = null;
}

async function loadManifest(env: AssetsEnv, requestUrl: string): Promise<ViteManifest> {
  if (manifestCache) {
    return manifestCache;
  }

  const candidatePaths = ['/.vite/manifest.json', '/manifest.json'];

  for (const pathname of candidatePaths) {
    const manifestUrl = new URL(pathname, requestUrl);
    const response = await env.ASSETS.fetch(manifestUrl.toString());

    if (!response.ok) {
      continue;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      continue;
    }

    try {
      manifestCache = (await response.json()) as ViteManifest;
      return manifestCache;
    } catch (error) {
      console.debug(`Unable to parse Vite manifest at ${pathname}:`, error);
    }
  }

  throw new Error('Failed to load Vite manifest from known locations.');
}

export async function resolveClientAssets(env: AssetsEnv, requestUrl: string): Promise<SSRClientAssetRefs> {
  try {
    const manifest = await loadManifest(env, requestUrl);
    const entry = manifest['src/main.tsx'] ?? manifest['index.html'];

    if (entry?.file) {
      const moduleHref = `/${entry.file}`;
      const styleSet = new Set(entry.css ?? []);

      for (const importKey of entry.imports ?? []) {
        const imported = manifest[importKey];
        for (const cssHref of imported?.css ?? []) {
          styleSet.add(cssHref);
        }
      }

      const styleHrefs = Array.from(styleSet, (href) => `/${href}`);
      return { moduleHref, styleHrefs };
    }
  } catch (error) {
    console.warn('Falling back to dev asset path for SSR hydration:', error);
  }

  return {
    moduleHref: '/src/main.tsx',
    styleHrefs: [],
  };
}
