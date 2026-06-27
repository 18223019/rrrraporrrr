import type { PagesFunction } from '@cloudflare/workers-types';

export const onRequest: PagesFunction = async ({ request, env }) => {
  const indexUrl = new URL('/index.html', request.url);
  return env.ASSETS.fetch(indexUrl.toString());
};