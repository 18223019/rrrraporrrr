/// <reference types="@cloudflare/workers-types" />

/**
 * POST   /api/avatar  → upload/ganti foto profil milik user yang sedang login
 * DELETE /api/avatar  → hapus foto custom (kembali ke inisial)
 *
 * Wajib header: Authorization: Bearer <Firebase ID token>
 * Body POST: file gambar mentah (image/jpeg | image/png | image/webp), maks 512 KB.
 * Foto disimpan di KV (atau R2) dengan key avatars/<username>, jadi user hanya bisa
 * mengubah foto miliknya sendiri (username diambil dari token, bukan dari request).
 */

import { verifyFirebaseRequest } from '../../_lib/firebaseAuth';
import {
  deleteAvatar,
  hasAvatarStorage,
  isValidUsername,
  jsonResponse,
  putAvatar,
  type AvatarEnv,
} from '../../_lib/avatar';

type Env = AvatarEnv;

const MAX_BYTES = 512 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const handlePost: PagesFunction<Env> = async ({ request, env }) => {
  if (!hasAvatarStorage(env)) {
    return jsonResponse({
      error: 'AvatarStorageNotConfigured',
      message: 'Binding AVATAR_KV belum terpasang di Cloudflare (Settings → Bindings).',
    }, 500);
  }
  if (!env.FIREBASE_PROJECT_ID) {
    return jsonResponse({
      error: 'FirebaseProjectIdMissing',
      message: 'Variabel FIREBASE_PROJECT_ID belum diisi di Cloudflare (Settings → Variables).',
    }, 500);
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

  const version = await putAvatar(env, user.username, body, contentType, user.uid);
  return jsonResponse({ success: true, username: user.username, version: Number(version) });
};

const handleDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!hasAvatarStorage(env)) {
    return jsonResponse({
      error: 'AvatarStorageNotConfigured',
      message: 'Binding AVATAR_KV belum terpasang di Cloudflare (Settings → Bindings).',
    }, 500);
  }
  if (!env.FIREBASE_PROJECT_ID) {
    return jsonResponse({
      error: 'FirebaseProjectIdMissing',
      message: 'Variabel FIREBASE_PROJECT_ID belum diisi di Cloudflare (Settings → Variables).',
    }, 500);
  }

  const user = await verifyFirebaseRequest(request, env.FIREBASE_PROJECT_ID);
  if (!user || !isValidUsername(user.username)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  await deleteAvatar(env, user.username);
  return jsonResponse({ success: true, username: user.username, version: Date.now() });
};

/** Bungkus handler supaya error tak terduga tetap dikirim sebagai JSON yang jelas. */
const withErrorHandling = (handler: PagesFunction<Env>): PagesFunction<Env> => async (context) => {
  try {
    return await handler(context);
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    console.error('❌ /api/avatar error:', raw);
    const quota = /limit|quota|exceeded|429/i.test(raw);
    return jsonResponse({
      error: quota ? 'StorageQuotaExceeded' : 'AvatarServerError',
      message: quota
        ? `Kuota penyimpanan Cloudflare hari ini habis, coba lagi besok. (${raw})`
        : `Server error: ${raw}`,
    }, 500);
  }
};

export const onRequestPost = withErrorHandling(handlePost);
export const onRequestDelete = withErrorHandling(handleDelete);

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
