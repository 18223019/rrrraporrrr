/// <reference types="@cloudflare/workers-types" />

/**
 * Penyimpanan foto profil.
 * - AVATAR_KV     → Workers KV (gratis, TIDAK perlu kartu kredit). Dipakai kalau ada.
 * - AVATAR_BUCKET → R2 (opsional, butuh metode pembayaran untuk aktivasi).
 * Cukup bind salah satu di Cloudflare Pages → Settings → Bindings.
 */

export type AvatarEnv = {
  AVATAR_KV?: KVNamespace;
  AVATAR_BUCKET?: R2Bucket;
  FIREBASE_PROJECT_ID?: string;
};

export interface StoredAvatar {
  body: ArrayBuffer | ReadableStream;
  contentType: string;
  version: string;
}

export const avatarKey = (username: string) => `avatars/${username.toLowerCase()}`;

export const isValidUsername = (username: string) => /^[a-z0-9._-]{1,40}$/i.test(username);

export const hasAvatarStorage = (env: AvatarEnv) => Boolean(env.AVATAR_KV || env.AVATAR_BUCKET);

export async function putAvatar(
  env: AvatarEnv,
  username: string,
  body: ArrayBuffer,
  contentType: string,
  uid: string,
): Promise<string> {
  const version = String(Date.now());
  const key = avatarKey(username);

  if (env.AVATAR_KV) {
    await env.AVATAR_KV.put(key, body, { metadata: { contentType, version, uid } });
  } else if (env.AVATAR_BUCKET) {
    await env.AVATAR_BUCKET.put(key, body, {
      httpMetadata: { contentType },
      customMetadata: { uid, updatedAt: version },
    });
  } else {
    throw new Error('Avatar storage not configured');
  }

  return version;
}

export async function getAvatar(env: AvatarEnv, username: string): Promise<StoredAvatar | null> {
  const key = avatarKey(username);

  if (env.AVATAR_KV) {
    const { value, metadata } = await env.AVATAR_KV.getWithMetadata<{ contentType?: string; version?: string }>(
      key,
      { type: 'arrayBuffer', cacheTtl: 60 },
    );
    if (!value) return null;
    return {
      body: value,
      contentType: metadata?.contentType || 'image/jpeg',
      version: metadata?.version || '0',
    };
  }

  if (env.AVATAR_BUCKET) {
    const object = await env.AVATAR_BUCKET.get(key);
    if (!object) return null;
    return {
      body: object.body,
      contentType: object.httpMetadata?.contentType || 'image/jpeg',
      version: object.customMetadata?.updatedAt || object.etag,
    };
  }

  return null;
}

export async function deleteAvatar(env: AvatarEnv, username: string): Promise<void> {
  const key = avatarKey(username);
  if (env.AVATAR_KV) await env.AVATAR_KV.delete(key);
  if (env.AVATAR_BUCKET) await env.AVATAR_BUCKET.delete(key);
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
