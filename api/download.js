export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'MISSING DOWNLOAD URL' });
  }

  let target;
  try {
    target = new URL(url);
  } catch {
    return res.status(400).json({ error: 'INVALID URL' });
  }

  if (!['http:', 'https:'].includes(target.protocol)) {
    return res.status(400).json({ error: 'INVALID PROTOCOL' });
  }

  try {
    const upstream = await fetch(target.href, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
        'Accept': 'application/vnd.android.package-archive,*/*',
      },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'UPSTREAM DOWNLOAD FAILED' });
    }

    const contentType = upstream.headers.get('content-type') || 'application/vnd.android.package-archive';
    const contentLength = upstream.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment; filename="appify.apk"');
    res.setHeader('Cache-Control', 'no-store');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const arrayBuffer = await upstream.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch {
    return res.status(502).json({ error: 'COULD NOT REACH DOWNLOAD SERVER' });
  }
}