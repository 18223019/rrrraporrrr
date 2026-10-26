/// <reference types="@cloudflare/workers-types" />

/**
 * GET /api/avatar/<username> → tampilkan foto profil custom dari R2.
 * 404 kalau user belum upload (frontend akan fallback ke inisial).
 */

import { avatarKey, isValidUsername } from '../../_lib/avatar';

type Env = {
  AVATAR_BUCKET?: R2Bucket;
};

export const onRequestGet: PagesFunction<Env, 'username'> = async ({ request, env, params }) => {
  const raw = Array.isArray(params.username) ? params.username[0] : params.username;
  const username = String(raw || '').toLowerCase();

  if (!env.AVATAR_BUCKET || !isValidUsername(username)) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.AVATAR_BUCKET.get(avatarKey(username), {
    onlyIf: request.headers,
  });

  if (!object) {
    return new Response('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  // Pendek supaya foto baru cepat terlihat; URL di frontend juga diberi ?v=<versi>
  headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
  headers.set('X-Content-Type-Options', 'nosniff');

  // onlyIf terpenuhi (ETag sama) → R2 mengembalikan objek tanpa body
  if (!('body' in object) || !object.body) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(object.body, { headers });
};
