/**
 * Vercel Serverless Function — CoinEx Kline Proxy
 * Route: GET /api/kline?market=BTCUSDT&period=1hour&limit=70
 *
 * این function روی Vercel اجرا می‌شه و به جای مرورگر
 * با CoinEx API صحبت می‌کنه (مشکل CORS حل می‌شه)
 */

export default async function handler(req, res) {
  // تنظیم هدرهای CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // فقط GET مجاز است
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { market, period, limit = "70" } = req.query;

  if (!market || !period) {
    return res.status(400).json({ error: "پارامترهای market و period اجباری هستند" });
  }

  const url = new URL("https://api.coinex.com/v2/spot/kline");
  url.searchParams.set("market",  market.toUpperCase());
  url.searchParams.set("period",  period);
  url.searchParams.set("limit",   String(Math.min(parseInt(limit, 10) || 70, 1000)));

  try {
    const coinexRes = await fetch(url.toString(), {
      headers: {
        "User-Agent": "TradeMind/1.0",
        "Accept":     "application/json",
      },
    });

    const data = await coinexRes.json();

    // کش کوتاه‌مدت برای کاهش بار (30 ثانیه)
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    return res.status(coinexRes.status).json(data);

  } catch (err) {
    return res.status(503).json({ error: `خطا در اتصال به CoinEx: ${err.message}` });
  }
}
