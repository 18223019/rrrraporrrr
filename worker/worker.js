/**
 * ========================================
 * Cloudflare Worker - API Proxy & PDF Server
 * ========================================
 * 
 * Fungsi:
 * 1. Reverse proxy ke Google Apps Script (GAS)
 * 2. CORS allowlist untuk *.salmanitb.site
 * 3. Cache 5 menit untuk API responses
 * 4. Rate limiting dasar
 * 5. Serve PDF dari R2 bucket
 * 
 * Routes:
 * - /api/scores?month=<Tab>&name=<Panggilan> - Get scores
 * - /api/history?name=<Panggilan>&months=<n> - Get history
 * - /api/members - Get all members
 * - /api/pdf?month=<Tab>&name=<slug> - Serve PDF dari R2
 * - /api/ping - Health check
 */

// ========================================
// CONFIGURATION
// ========================================

/**
 * Google Apps Script Web App URL
 * Update this after deploying your GAS script
 * Last updated: 2025-10-12
 */
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwUfk-Md1lRLE-M5uaIYH-rX32FUf8fUvG1v6IUvGFRMsMinVuq8tNKTprds-boh7gn/exec';
const PAGES_ORIGIN = 'https://rapor-asrama-pages.pages.dev';
const ALLOWED_ORIGINS = [
  'https://rapor-asrama.salmanitb.site',
  'https://raporasrama2526.web.app',
  'https://raporasrama2526.firebaseapp.com',
];
const CACHE_TTL = 300; // 5 minutes
const PDF_CACHE_TTL = 31536000; // 1 year (immutable PDFs)
const RATE_LIMIT_MAX = 100; // requests per minute per IP

const STATIC_CONTENT_TYPES = new Map([
  ['js', 'application/javascript; charset=utf-8'],
  ['mjs', 'application/javascript; charset=utf-8'],
  ['css', 'text/css; charset=utf-8'],
  ['json', 'application/json; charset=utf-8'],
  ['svg', 'image/svg+xml'],
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
  ['ico', 'image/x-icon'],
  ['woff', 'font/woff'],
  ['woff2', 'font/woff2'],
]);

// CORS headers
function getCorsHeaders(origin) {
  if (ALLOWED_ORIGINS.includes(origin) || origin?.endsWith('.salmanitb.site')) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
  }
  return {};
}

// Handle CORS preflight
function handleOptions(request) {
  const origin = request.headers.get('Origin');
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

// Validate query parameters
function validateParams(params, required) {
  for (const key of required) {
    if (!params.has(key)) {
      return { valid: false, error: `Missing parameter: ${key}` };
    }
    const value = params.get(key);
    if (!value || value.length > 100) {
      return { valid: false, error: `Invalid parameter: ${key}` };
    }
  }
  return { valid: true };
}

// ========================================
// PROXY & PDF FUNCTIONS
// ========================================

/**
 * Proxy request to Google Apps Script
 */
async function proxyToGAS(path, params) {
  const gasUrl = new URL(GAS_WEB_APP_URL);
  
  // Add path parameter
  gasUrl.searchParams.set('path', path);
  
  // Copy all query params
  for (const [key, value] of params.entries()) {
    gasUrl.searchParams.set(key, value);
  }
  
  try {
    const response = await fetch(gasUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Cloudflare-Worker-RaporAsrama/1.0',
        'Accept': 'application/json',
      },
      // Follow redirects
      redirect: 'follow',
    });
    
    // Clone response to read and cache
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();
    
    // Add cache headers
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
    headers.set('X-Cache-TTL', CACHE_TTL.toString());
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: headers,
    });
    
  } catch (error) {
    console.error('GAS Proxy Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to proxy to GAS',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get PDF from R2 bucket
 */
async function getPDF(env, month, name) {
  // Extract year from month (e.g., "Oktober25" -> "2025")
  const yearMatch = month.match(/\d{2}$/);
  const year = yearMatch ? `20${yearMatch[0]}` : '2025';
  
  const key = `rapor/${year}/${month}/${name}.pdf`;
  
  try {
    const object = await env.ASRAMA_BUCKET.get(key);
    
    if (!object) {
      return new Response(
        JSON.stringify({
          error: 'PDF not found',
          key: key,
          month: month,
          name: name,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="rapor-${name}-${month}.pdf"`);
    headers.set('Cache-Control', `public, max-age=${PDF_CACHE_TTL}, immutable`);
    headers.set('X-Content-Type-Options', 'nosniff');
    
    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

// ========================================
// RATE LIMITING
// ========================================

/**
 * Simple rate limiting using KV
 */
async function checkRateLimit(env, ip) {
  if (!env.RATE_LIMIT) return true;
  
  const key = `ratelimit:${ip}`;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  
  try {
    const data = await env.RATE_LIMIT.get(key, { type: 'json' });
    
    if (!data) {
      // First request
      await env.RATE_LIMIT.put(
        key,
        JSON.stringify({ count: 1, resetAt: now + windowMs }),
        { expirationTtl: 60 }
      );
      return true;
    }
    
    if (now > data.resetAt) {
      // Window expired, reset
      await env.RATE_LIMIT.put(
        key,
        JSON.stringify({ count: 1, resetAt: now + windowMs }),
        { expirationTtl: 60 }
      );
      return true;
    }
    
    if (data.count >= RATE_LIMIT_MAX) {
      return false;
    }
    
    // Increment count
    await env.RATE_LIMIT.put(
      key,
      JSON.stringify({ count: data.count + 1, resetAt: data.resetAt }),
      { expirationTtl: 60 }
    );
    return true;
    
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true; // Allow on error
  }
}

// ========================================
// SITE PROXY HELPERS
// ========================================

async function proxySiteRequest(request, url) {
  const normalised = normaliseSitePath(url);
  if (normalised.redirect) {
    return normalised.redirect;
  }

  const upstreamUrl = new URL(PAGES_ORIGIN);
  const isAssetRequest = hasFileExtension(normalised.pathname);
  upstreamUrl.pathname = isAssetRequest ? normalised.pathname : '/index.html';
  upstreamUrl.search = isAssetRequest ? url.search : '';

  const upstreamRequest = new Request(upstreamUrl.toString(), request);
  let upstreamResponse = await fetch(upstreamRequest, { redirect: 'manual' });

  if (shouldFollowRedirect(upstreamResponse)) {
    const location = upstreamResponse.headers.get('Location');
    if (location) {
      const redirectedUrl = new URL(location, PAGES_ORIGIN);
      upstreamResponse = await fetch(redirectedUrl.toString(), {
        method: upstreamRequest.method,
        headers: upstreamRequest.headers,
        redirect: 'follow',
      });
    }
  }

  const response = new Response(upstreamResponse.body, upstreamResponse);

  const overrideType = isAssetRequest
    ? guessContentType(normalised.pathname, upstreamResponse.headers.get('Content-Type'))
    : null;
  if (overrideType) {
    response.headers.set('Content-Type', overrideType);
  }

  response.headers.set('X-Proxy-Origin', PAGES_ORIGIN);
  return response;
}

function normaliseSitePath(url) {
  const originalPath = url.pathname || '/';
    let collapsed = originalPath.replace(/\/+/g, '/');
  let shouldRedirect = collapsed !== originalPath;

  if (!collapsed.startsWith('/')) {
    collapsed = `/${collapsed}`;
    shouldRedirect = true;
  }

  if (collapsed === '') {
    collapsed = '/';
    shouldRedirect = collapsed !== originalPath;
  }

  if (collapsed === '/coach') {
    collapsed = '/coach/';
    shouldRedirect = false;
  }

  if (shouldRedirect) {
    const redirectUrl = new URL(url.toString());
    redirectUrl.pathname = collapsed;
    return { redirect: Response.redirect(redirectUrl.toString(), 301) };
  }

  return { pathname: collapsed };
}

function guessContentType(pathname, upstreamType) {
  if (upstreamType && !upstreamType.toLowerCase().startsWith('text/html')) {
    return null;
  }

  const lastSegment = pathname.split('/').pop() || '';
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex === -1) {
    return null;
  }

  const ext = lastSegment.slice(dotIndex + 1).toLowerCase();
  return STATIC_CONTENT_TYPES.get(ext) || null;
}

function hasFileExtension(pathname) {
  const segment = pathname.split('/').pop() || '';
  const dotIndex = segment.lastIndexOf('.');
  return dotIndex > 0 && dotIndex < segment.length - 1;
}

function shouldFollowRedirect(response) {
  const status = response.status;
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function proxyPagesApi(request, url) {
  const target = new URL(PAGES_ORIGIN);
  target.pathname = url.pathname;
  target.search = url.search;

  const proxiedRequest = new Request(target.toString(), request);
  const proxiedResponse = await fetch(proxiedRequest, { redirect: 'follow' });
  const response = new Response(proxiedResponse.body, proxiedResponse);
  response.headers.set('X-Proxy-Origin', PAGES_ORIGIN);
  return response;
}

// ========================================
// MAIN HANDLER
// ========================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return proxySiteRequest(request, url);
    }

    const origin = request.headers.get('Origin');
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Rate limiting (API only)
    const rateLimitOk = await checkRateLimit(env, clientIP);
    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          limit: RATE_LIMIT_MAX,
          window: '1 minute',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Health check
    if (url.pathname === '/api/ping') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          worker: 'rapor-asrama-v3',
          gas: GAS_WEB_APP_URL !== 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Route handling
    const params = url.searchParams;

    try {
      let response;

      switch (url.pathname) {
        case '/api/scores':
          // Validate: month required, name optional
          const scoreValidation = validateParams(params, ['month']);
          if (!scoreValidation.valid) {
            return new Response(JSON.stringify({ error: scoreValidation.error }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) },
            });
          }
          response = await proxyToGAS('scores', params);
          break;

        case '/api/history':
          // Validate: name and months required
          const historyValidation = validateParams(params, ['name']);
          if (!historyValidation.valid) {
            return new Response(JSON.stringify({ error: historyValidation.error }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) },
            });
          }
          // Default months to 3 if not provided
          if (!params.has('months')) {
            params.set('months', '3');
          }
          response = await proxyToGAS('history', params);
          break;

        case '/api/members':
          response = await proxyToGAS('members', params);
          break;

        case '/api/pdf':
          // Validate: month and name required
          const pdfValidation = validateParams(params, ['month', 'name']);
          if (!pdfValidation.valid) {
            return new Response(JSON.stringify({ error: pdfValidation.error }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) },
            });
          }
          return await getPDF(env, params.get('month'), params.get('name'));

        case '/api/rapor': {
          // Canary/Pages-target route: proxy to GAS based on ?resource= param
          const resource = params.get('resource');
          const allowedResources = ['scores', 'history', 'members', 'months'];
          if (!resource || !allowedResources.includes(resource)) {
            return new Response(
              JSON.stringify({ error: 'Missing or invalid resource param', allowed: allowedResources }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) } }
            );
          }
          response = await proxyToGAS(resource, params);
          break;
        }

        case '/api/months':
          response = await proxyToGAS('months', params);
          break;

        case '/api/vitals':
          return proxyPagesApi(request, url);

        default:
          return new Response(
            JSON.stringify({
              error: 'Not found',
              path: url.pathname,
              availableEndpoints: ['/api/scores', '/api/history', '/api/members', '/api/pdf', '/api/vitals', '/api/ping'],
            }),
            {
              status: 404,
              headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) },
            }
          );
      }

      // Add CORS and cache headers to response
      const modifiedResponse = new Response(response.body, response);
      Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
        modifiedResponse.headers.set(key, value);
      });
      modifiedResponse.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);

      return modifiedResponse;
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      });
    }
  },
};
