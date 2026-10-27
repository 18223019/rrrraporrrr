/// <reference types="@cloudflare/workers-types" />

/**
 * GET /api/avatar/<username> → tampilkan foto profil custom (dari KV atau R2).
 * 404 kalau user belum upload (frontend akan fallback ke inisial).
 */

import { getAvatar, isValidUsername, type AvatarEnv } from '../../_lib/avatar';

export const onRequestGet: PagesFunction<AvatarEnv, 'username'> = async ({ request, env, params }) => {
  const raw = Array.isArray(params.username) ? params.username[0] : params.username;
  const username = String(raw || '').toLowerCase();

  if (!isValidUsername(username)) {
    return new Response('Not found', { status: 404 });
  }

  const avatar = await getAvatar(env, username);
  if (!avatar) {
    return new Response('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }

  const etag = `"${avatar.version}"`;
  const headers = new Headers({
    'Content-Type': avatar.contentType,
    ETag: etag,
    // Pendek supaya foto baru cepat terlihat; URL di frontend juga diberi ?v=<versi>
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
    'X-Content-Type-Options': 'nosniff',
  });

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(avatar.body, { headers });
};
