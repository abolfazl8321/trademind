/**
 * Vercel Serverless Function — CoinEx Ticker Proxy
 * Route: GET /api/ticker
 *
 * لیست همه ارزها برای سیگنال‌های خودکار
 */

export default async function handler(req, res) {
  // تنظیم هدرهای CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const coinexRes = await fetch("https://api.coinex.com/v2/spot/ticker", {
      headers: {
        "User-Agent": "TradeMind/1.0",
        "Accept":     "application/json",
      },
    });

    const data = await coinexRes.json();

    // کش ۶۰ ثانیه‌ای (ticker نیاز به real-time ندارد)
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(coinexRes.status).json(data);

  } catch (err) {
    return res.status(503).json({ error: `خطا در اتصال به CoinEx: ${err.message}` });
  }
}
