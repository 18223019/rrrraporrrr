import type { PagesFunction } from '@cloudflare/workers-types';

const ASSET_EXTENSION_REGEX = /\.[a-zA-Z0-9]+$/;

const FORWARDED_PATH_PREFIXES = ['/api', '/dashboard', '/worker'];

export const onRequest: PagesFunction = async (context) => {
  const { request, env, next } = context;
  const { pathname } = new URL(request.url);

  if (request.method !== 'GET') {
    return next();
  }

  if (pathname === '/' || pathname === '/index.html') {
    return next();
  }

  if (FORWARDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return next();
  }

  if (ASSET_EXTENSION_REGEX.test(pathname)) {
    return next();
  }

  const indexUrl = new URL('/index.html', request.url);
  return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
};
