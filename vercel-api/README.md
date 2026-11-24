# Web2APK clone-compatible API for Vercel

This is a standalone Vercel Node.js Function that mirrors the supplied Web2APK API's request/response contract while calling the original service server-side. It accepts the same six JSON fields, forwards the request unchanged, preserves the upstream HTTP status and response fields, and adds `developer: "Aditya"` to JSON object responses. The upstream response is not moved under a wrapper field.

The `developer` field identifies this Vercel clone/proxy response only. It does not change the developer, signing identity, or publisher metadata embedded in an APK by the upstream builder. That would require the upstream builder to support a separate developer/metadata input.

## Deploy

1. Create a Vercel project and set its **Root Directory** to `vercel-api`.
2. In Vercel Environment Variables, add `WEB2APK_UPSTREAM_URL` and set it to the original Web2APK API URL you supplied. The handler reads this value server-side, so the original URL does not appear in browser requests.
3. Add `ALLOWED_ORIGIN` with the exact website origin, for example `https://your-site.example` (scheme and host only; no trailing path). For temporary testing you may use `*`; replace it with your exact website origin before production.
4. Deploy. The API URL will be `https://<your-vercel-project>.vercel.app/api/web2apk`.

The request uses these required fields: `websiteUrl`, `appName`, `icon`, `packageName`, `versionName`, and `versionCode`. Once you are ready to work on the website, its `API_URL` can be changed to the deployed Vercel endpoint.

## Important security note

The clone hides the upstream URL from browser requests, but the Vercel endpoint itself remains public. CORS restricts browsers, not command-line clients; add rate limiting or authentication before exposing the endpoint broadly. Do not rely on a hidden URL as access control.
