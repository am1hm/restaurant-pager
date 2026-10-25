// Sends one "order ready" push notification.
// Body: { sub: PushSubscriptionJSON, no: "105", url: "https://.../?r=..&o=105" }
const webpush = require("web-push");

const VAPID_PUBLIC_KEY = "BAdP2nXmySk_D7ZfD0iuQGaiXu8pkYBT7nMT3QywzIVaJ3-02MbIUepwLiEY6Ovu3uBvRv9o2T0UGhAY6viPbtk";
// Only real browser push services, so this can't be used to call arbitrary URLs.
const ALLOWED_HOSTS = [/(^|\.)googleapis\.com$/, /(^|\.)mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!priv) return res.status(500).json({ error: "missing VAPID_PRIVATE_KEY" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const sub = body && body.sub;
  const no = body && String(body.no || "");
  if (!sub || typeof sub.endpoint !== "string" || !sub.keys || !/^[A-Za-z0-9]{1,8}$/.test(no)) {
    return res.status(400).json({ error: "bad request" });
  }
  let host;
  try { const u = new URL(sub.endpoint); if (u.protocol !== "https:") throw 0; host = u.hostname; }
  catch (e) { return res.status(400).json({ error: "bad endpoint" }); }
  if (!ALLOWED_HOSTS.some((r) => r.test(host))) return res.status(400).json({ error: "endpoint not allowed" });

  const origin = "https://" + (req.headers["x-forwarded-host"] || req.headers.host);
  let url = origin + "/";
  try { const u = new URL(body.url); if (u.origin === origin) url = u.href; } catch (e) {}

  webpush.setVapidDetails(origin, VAPID_PUBLIC_KEY, priv);
  const payload = JSON.stringify({
    title: "طلبك رقم " + no + " جاهز!",
    body: "تفضّل للكاونتر واستلم طلبك.",
    no,
    url
  });
  try {
    await webpush.sendNotification(sub, payload, { TTL: 900, urgency: "high" });
    return res.status(200).json({ ok: true });
  } catch (err) {
    const code = err && err.statusCode;
    if (code === 404 || code === 410) return res.status(200).json({ ok: false, gone: true });
    return res.status(502).json({ ok: false, error: "push failed", status: code || null });
  }
};
