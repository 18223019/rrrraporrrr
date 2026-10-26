/// <reference types="@cloudflare/workers-types" />

/**
 * POST   /api/avatar  → upload/ganti foto profil milik user yang sedang login
 * DELETE /api/avatar  → hapus foto custom (kembali ke inisial)
 *
 * Wajib header: Authorization: Bearer <Firebase ID token>
 * Body POST: file gambar mentah (image/jpeg | image/png | image/webp), maks 512 KB.
 * Foto disimpan di R2 dengan key avatars/<username>, jadi user hanya bisa
 * mengubah foto miliknya sendiri (username diambil dari token, bukan dari request).
 */

import { verifyFirebaseRequest } from '../../_lib/firebaseAuth';
import { avatarKey, isValidUsername, jsonResponse } from '../../_lib/avatar';

type Env = {
  AVATAR_BUCKET?: R2Bucket;
  FIREBASE_PROJECT_ID?: string;
};

const MAX_BYTES = 512 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.AVATAR_BUCKET) {
    return jsonResponse({ error: 'AvatarStorageNotConfigured' }, 500);
  }

  const user = await verifyFirebaseRequest(request, env.FIREBASE_PROJECT_ID);
  if (!user || !isValidUsername(user.username)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const contentType = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) {
    return jsonResponse({ error: 'UnsupportedType', message: 'Gunakan JPG, PNG, atau WEBP.' }, 415);
  }

  const declaredLength = Number(request.headers.get('Content-Length') || '0');
  if (declaredLength > MAX_BYTES) {
    return jsonResponse({ error: 'TooLarge', message: 'Maksimal 512 KB.' }, 413);
  }

  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_BYTES) {
    return jsonResponse({ error: 'TooLarge', message: 'Ukuran file tidak valid (maks 512 KB).' }, 413);
  }

  if (!matchesMagicBytes(new Uint8Array(body), contentType)) {
    return jsonResponse({ error: 'InvalidImage', message: 'File bukan gambar yang valid.' }, 400);
  }

  const updatedAt = Date.now();
  await env.AVATAR_BUCKET.put(avatarKey(user.username), body, {
    httpMetadata: { contentType, cacheControl: 'public, max-age=60' },
    customMetadata: { uid: user.uid, updatedAt: String(updatedAt) },
  });

  return jsonResponse({ success: true, username: user.username, version: updatedAt });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.AVATAR_BUCKET) {
    return jsonResponse({ error: 'AvatarStorageNotConfigured' }, 500);
  }

  const user = await verifyFirebaseRequest(request, env.FIREBASE_PROJECT_ID);
  if (!user || !isValidUsername(user.username)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  await env.AVATAR_BUCKET.delete(avatarKey(user.username));
  return jsonResponse({ success: true, username: user.username, version: Date.now() });
};

function matchesMagicBytes(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === 'image/png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (contentType === 'image/webp') {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    return riff === 'RIFF' && webp === 'WEBP';
  }
  return false;
}
