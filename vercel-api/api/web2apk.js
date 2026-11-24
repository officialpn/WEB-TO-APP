const REQUIRED_FIELDS = ['websiteUrl', 'appName', 'icon', 'packageName', 'versionName', 'versionCode'];

function allowedOriginForRequest(origin) {
  const configured = process.env.ALLOWED_ORIGIN || '*';
  if (configured === '*') return '*';
  return origin === configured ? configured : null;
}

function setCorsHeaders(res, origin) {
  const allowedOrigin = allowedOriginForRequest(origin);
  if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  return Boolean(allowedOrigin);
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function parseRequestBody(body) {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
}

function missingFields(body) {
  return REQUIRED_FIELDS.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === 'string' && !value.trim());
  });
}

function addDeveloperName(body) {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return JSON.stringify({ ...body, developer: 'Aditya' });
  }
  return null;
}

module.exports = async function handler(req, res) {
  const origin = req.headers?.origin || '';
  const originAllowed = setCorsHeaders(res, origin);
  if (!originAllowed) {
    return sendJson(res, 403, { status: 'error', error: 'This website origin is not allowed.', developer: 'Aditya' });
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendJson(res, 405, { status: 'error', error: 'Use POST to submit a Web2APK build request.', developer: 'Aditya' });
  }

  const body = parseRequestBody(req.body);
  if (!body) {
    return sendJson(res, 400, { status: 'error', error: 'Send a valid JSON object.', developer: 'Aditya' });
  }
  const missing = missingFields(body);
  if (missing.length) {
    return sendJson(res, 400, { status: 'error', error: `Required fields: ${missing.join(', ')}`, developer: 'Aditya' });
  }

  const upstreamUrl = process.env.WEB2APK_UPSTREAM_URL;
  if (!upstreamUrl) {
    return sendJson(res, 500, { status: 'error', error: 'The server is missing its upstream API configuration.', developer: 'Aditya' });
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const raw = await upstreamResponse.text();
    let responseBody = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : {};
      const tagged = addDeveloperName(parsed);
      if (tagged !== null) responseBody = tagged;
    } catch {
      // Preserve a non-JSON upstream response unchanged; the upstream API contract is JSON.
    }

    res.statusCode = upstreamResponse.status;
    res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(responseBody);
  } catch {
    return sendJson(res, 502, { status: 'error', error: 'Could not reach the upstream Web2APK service.', developer: 'Aditya' });
  }
};
