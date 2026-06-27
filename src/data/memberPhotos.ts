// Local profile photo mapping for dashboard avatars
// Import foto profil baru di sini nantinya

type MemberPhotoEntry = {
  name: string;
  username: string;
  aliases?: string[];
  asset: string;
};

// Kosongkan untuk kepengurusan baru
const entries: MemberPhotoEntry[] = [];

const photoByKey = new Map<string, string>();

function normalize(value?: string | null): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

for (const entry of entries) {
  const keys = new Set<string>([
    entry.name,
    entry.username,
    ...(entry.aliases ?? []),
  ]);

  for (const key of keys) {
    const normalized = normalize(key);
    if (normalized) {
      photoByKey.set(normalized, entry.asset);
    }
  }
}

export function getMemberPhoto(keys: {
  name?: string | null;
  username?: string | null;
  panggilan?: string | null;
  slug?: string | null;
}): string | undefined {
  const candidates = [keys.username, keys.panggilan, keys.slug, keys.name];

  for (const candidate of candidates) {
    const normalized = normalize(candidate);
    if (!normalized) {
      continue;
    }
    const asset = photoByKey.get(normalized);
    if (asset) {
      return asset;
    }
  }

  return undefined;
}

export const memberPhotoEntries = entries;
