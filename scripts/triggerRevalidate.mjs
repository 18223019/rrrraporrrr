import { createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { config as dotenvConfig } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const DOTENV_CANDIDATES = [
  path.join(ROOT_DIR, '.env.local'),
  path.join(ROOT_DIR, '.env'),
  path.join(ROOT_DIR, 'functions', '.dev.vars'),
];

for (const candidate of DOTENV_CANDIDATES) {
  if (existsSync(candidate)) {
    dotenvConfig({ path: candidate, override: false });
  }
}

/**
 * @returns {Record<string, string | boolean>}
 */
function parseArgs() {
  const result = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }

    const trimmed = token.slice(2);
    const equalsIndex = trimmed.indexOf('=');

    let rawKey;
    let rawValue;

    if (equalsIndex >= 0) {
      rawKey = trimmed.slice(0, equalsIndex);
      rawValue = trimmed.slice(equalsIndex + 1);
    } else {
      rawKey = trimmed;
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        rawValue = next;
        i += 1; // Skip next token since it's consumed as value
      }
    }

    const key = rawKey.trim().toLowerCase();

    if (!key) {
      continue;
    }

    if (rawValue === undefined || rawValue === '') {
      result[key] = true;
    } else {
      result[key] = rawValue.trim();
    }
  }

  return result;
}

const args = parseArgs();

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} is required. Provide it via --${name.toLowerCase()} or environment variable.`);
  }
  return value;
}

function resolveUrl() {
  const fromArgs = typeof args.url === 'string' ? args.url : null;
  const fromEnv =
    process.env.CLOUDFLARE_REVALIDATE_URL ??
    process.env.REVALIDATE_URL ??
    (process.env.DEPLOYED_ORIGIN ? `${process.env.DEPLOYED_ORIGIN.replace(/\/$/, '')}/api/revalidate` : null);

  const value = fromArgs ?? fromEnv;

  if (!value) {
    throw new Error('Missing revalidate endpoint. Pass --url=... or set CLOUDFLARE_REVALIDATE_URL or REVALIDATE_URL.');
  }

  return value;
}

function resolveSecret() {
  const fromArgs = typeof args.secret === 'string' ? args.secret : null;
  const fromEnv = process.env.REVALIDATE_SECRET ?? process.env.CLOUDFLARE_REVALIDATE_SECRET;
  const value = fromArgs ?? fromEnv;

  if (!value) {
    throw new Error('Missing HMAC secret. Pass --secret=... or set REVALIDATE_SECRET / CLOUDFLARE_REVALIDATE_SECRET.');
  }

  return value;
}

const month = requireString(args.month ?? process.env.REVALIDATE_MONTH, 'month');
const slug = typeof args.slug === 'string' ? args.slug : process.env.REVALIDATE_SLUG ?? undefined;
const reason = typeof args.reason === 'string' ? args.reason : undefined;
function resolveBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
  }

  return fallback;
}

const prewarm = resolveBoolean(args.prewarm ?? (args['no-prewarm'] ? 'false' : undefined), true);
const issuedAtSeconds = Math.floor(Date.now() / 1000);
const targetUrl = resolveUrl();
const secret = resolveSecret();

const payload = {
  month,
  slug,
  reason,
  prewarm,
  issuedAt: issuedAtSeconds,
  signature: createHmac('sha256', secret)
    .update(`${month}:${slug ?? ''}:${issuedAtSeconds}`)
    .digest('hex'),
};

async function main() {
  if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_ENV = 'development';
  }

  const body = JSON.stringify(payload, null, 2);

  if (args.verbose) {
    console.log('POST', targetUrl);
    console.log('Payload:', body);
  }

  let response;
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body,
    });
  } catch (error) {
    console.error('Failed to reach revalidate endpoint.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  const text = await response.text();
  let json;

  try {
    json = JSON.parse(text);
  } catch (error) {
    json = text;
  }

  if (!response.ok) {
    console.error(`Revalidation failed with status ${response.status}`);
    console.error(json);
    process.exitCode = 1;
    return;
  }

  console.log('Revalidation request succeeded.');
  console.log(json);
}

main().catch((error) => {
  console.error('Unexpected error while triggering revalidation:');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
