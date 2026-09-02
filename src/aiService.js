/* ---------------------------------------------------------------
   AI Service — CoinEx Market Data + Google Gemini Analysis
   ---------------------------------------------------------------
   ✅ داده کندل: /api/kline  ← Python Proxy ← CoinEx V2 (CORS-free)
   ✅ تحلیل AI: Google Gemini 3.6 Flash (با فال‌بک به 2.5 Flash)
   ✅ مدیریت توکن: Rate Limiter سمت کلاینت + مدیریت 429
   ✅ پاکسازی JSON: حذف کاراکترهای نامعتبر + Retry خودکار
--------------------------------------------------------------- */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

/* ------------------------------------------------------------------
   مدل‌های Gemini — اصلی + فال‌بک
   gemini-3.6-flash: جدیدترین و سریع‌ترین
   gemini-2.5-flash: پایدارترین (فال‌بک)
------------------------------------------------------------------ */
const GEMINI_MODELS = [
  "gemini-3.6-flash"
];

/* ------------------------------------------------------------------
   ⚡ Rate Limiter — مدیریت تعداد درخواست‌ها در دقیقه
   نسخه رایگان Gemini API:
     - gemini-3.6-flash: حدود 10 RPM (درخواست در دقیقه)
     - gemini-2.5-flash: حدود 15 RPM
     - محدودیت روزانه: 1500 درخواست در روز
     - محدودیت توکن: حدود 1,000,000 TPM (توکن در دقیقه)
   
   ما سمت کلاینت محدودیت 8 RPM اعمال می‌کنیم تا هرگز به 429 نخوریم
------------------------------------------------------------------ */
const RATE_LIMIT = {
  maxRequestsPerMinute: 8,
  requestTimestamps: [],
  dailyCount: 0,
  dailyResetTime: 0,
  maxDailyRequests: 1400, // کمتر از 1500 واقعی برای ایمنی
};

/**
 * بررسی اینکه آیا می‌توانیم درخواست بزنیم یا نه
 * @returns {{ allowed: boolean, waitSeconds: number, message: string }}
 */
export function checkRateLimit() {
  const now = Date.now();

  // ریست شمارنده روزانه (هر 24 ساعت)
  if (now - RATE_LIMIT.dailyResetTime > 24 * 60 * 60 * 1000) {
    RATE_LIMIT.dailyCount = 0;
    RATE_LIMIT.dailyResetTime = now;
  }

  // بررسی محدودیت روزانه
  if (RATE_LIMIT.dailyCount >= RATE_LIMIT.maxDailyRequests) {
    const resetIn = Math.ceil((RATE_LIMIT.dailyResetTime + 24 * 60 * 60 * 1000 - now) / 1000 / 60 / 60);
    return {
      allowed: false,
      waitSeconds: 0,
      message: `⚠️ سقف درخواست‌های روزانه (${RATE_LIMIT.maxDailyRequests} تحلیل) تمام شده است.\nتوکن‌های شما حدود ${resetIn} ساعت دیگر مجدداً شارژ می‌شوند (هر ۲۴ ساعت ریست می‌شود).`,
    };
  }

  // پاکسازی درخواست‌های قدیمی‌تر از 1 دقیقه
  RATE_LIMIT.requestTimestamps = RATE_LIMIT.requestTimestamps.filter(
    (ts) => now - ts < 60_000
  );

  // بررسی محدودیت دقیقه‌ای
  if (RATE_LIMIT.requestTimestamps.length >= RATE_LIMIT.maxRequestsPerMinute) {
    const oldestRequest = RATE_LIMIT.requestTimestamps[0];
    const waitMs = 60_000 - (now - oldestRequest);
    const waitSeconds = Math.ceil(waitMs / 1000);
    return {
      allowed: false,
      waitSeconds,
      message: `⚠️ تعداد درخواست‌های شما در این دقیقه به حداکثر رسیده است (${RATE_LIMIT.maxRequestsPerMinute} تحلیل در دقیقه).\nلطفاً ${waitSeconds} ثانیه صبر کنید تا ظرفیت توکن‌ها مجدداً شارژ شود.`,
    };
  }

  return {
    allowed: true,
    waitSeconds: 0,
    message: "",
    remaining: RATE_LIMIT.maxRequestsPerMinute - RATE_LIMIT.requestTimestamps.length,
    dailyRemaining: RATE_LIMIT.maxDailyRequests - RATE_LIMIT.dailyCount,
  };
}

/** ثبت درخواست جدید در Rate Limiter */
function recordRequest() {
  RATE_LIMIT.requestTimestamps.push(Date.now());
  RATE_LIMIT.dailyCount++;
}

/* ------------------------------------------------------------------
   نگاشت Timeframe: فرمت UI → فرمت CoinEx API
   CoinEx periods: 1min,3min,5min,15min,30min,1hour,2hour,4hour,6hour,12hour,1day,3day,1week
------------------------------------------------------------------ */
const PERIOD_MAP = {
  "1m": "1min",
  "3m": "3min",
  "5m": "5min",
  "15m": "15min",
  "30m": "30min",
  "1h": "1hour",
  "2h": "2hour",
  "4h": "4hour",
  "6h": "6hour",
  "12h": "12hour",
  "1d": "1day",
  "3d": "3day",
  "1w": "1week",
};

export const TIMEFRAME_OPTIONS = [
  { value: "1m", label: "۱ دقیقه" },
  { value: "5m", label: "۵ دقیقه" },
  { value: "15m", label: "۱۵ دقیقه" },
  { value: "30m", label: "۳۰ دقیقه" },
  { value: "1h", label: "۱ ساعته" },
  { value: "4h", label: "۴ ساعته" },
  { value: "1d", label: "روزانه" },
];

export const TOP_SYMBOLS = [
  "BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "NEAR",
  "DOT", "MATIC", "TRX", "LTC", "BCH", "SHIB", "UNI", "ATOM", "ETC", "XLM",
  "ICP", "VET", "FIL", "RNDR", "AR", "OP", "ARB", "AAVE", "SUI", "APT",
  "INJ", "GRT", "SNX", "MKR", "QNT", "ALGO", "STX", "EGLD", "SAND", "MANA",
  "THETA", "AXS", "FTM", "EOS", "XTZ", "KAVA", "FLOW", "NEO", "CHZ", "CRV",
  "ENJ", "GALA", "LDO", "RUNE", "ZIL", "BAT", "COMP", "DASH", "ZEC", "XMR",
  "1INCH", "SUSHI", "YFI", "CAKE", "WAVES", "KSM", "MINA", "DYDX", "GMX", "CFX",
  "PEPE", "FLOKI", "BONK", "WIF", "ORDI", "SATS", "BOME", "FET", "AGIX", "OCEAN",
  "RPL", "LRC", "BAL", "BAND", "CVC", "STORJ", "SC", "DGB", "RVN", "ONE",
  "CELO", "GLMR", "MOVR", "KDA", "CKB", "IOTX", "WAXP", "SYS", "HIVE", "STEEM",
  "LSK", "NANO", "ICX", "ONT", "QTUM", "OMG", "ZRX", "REP", "NMR", "RLC",
  "OXT", "LPT", "AUDIO", "SKL", "CTSI", "TRU", "LIT", "SFP", "TWT", "C98",
  "BICO", "API3", "UMA", "RAD", "ENS", "GAL", "GMT", "APE", "LUNA", "LUNC",
  "ROSE", "SCRT", "XEC", "BTT", "WIN", "HOT", "DENT", "VTHO", "IOST", "MBL",
  "STPT", "TROY", "COS", "ARPA", "NKN", "DUSK", "ANKR", "MTL", "BLZ", "TOMO"
];


/* ------------------------------------------------------------------
   تعداد کندل بر اساس تایم‌فریم
   - کمتر از ۳۰ دقیقه: ۱۰۰ کندل (نویز بیشتر، نیاز به داده بیشتر)
   - ۳۰ دقیقه و بالاتر: ۷۰ کندل (کافی برای تحلیل)
------------------------------------------------------------------ */
function fetchLimitFor(interval) {
  const shortTFs = ["1m", "3m", "5m", "15m"];
  return shortTFs.includes(interval) ? 100 : 70;
}

/* ------------------------------------------------------------------
   تعداد کندل ارسالی به Gemini (برای صرفه‌جویی توکن)
   - تایم‌فریم کوتاه: ۴۰ کندل (کاهش توکن مصرفی)
   - تایم‌فریم بلند: ۵۰ کندل
------------------------------------------------------------------ */
function promptSliceFor(interval) {
  const shortTFs = ["1m", "3m", "5m", "15m"];
  return shortTFs.includes(interval) ? 40 : 70;
}

/* ------------------------------------------------------------------
   دریافت کندل از CoinEx (از طریق Python Proxy — بدون CORS)
------------------------------------------------------------------ */
export async function fetchCoinExKlines(symbol, interval = "1h", limit = 70) {
  const period = PERIOD_MAP[interval] || "1hour";
  const market = symbol.toUpperCase().replace("/", "");

  // URL نسبی: Vite در dev به localhost:8000 پروکسی می‌کنه
  const url = new URL("/api/kline", window.location.origin);
  url.searchParams.set("market", market);
  url.searchParams.set("period", period);
  url.searchParams.set("limit", String(Math.min(limit, 1000)));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`خطا در دریافت داده CoinEx: ${res.status}`);
  }

  const json = await res.json();

  if (json.code !== 0) {
    throw new Error(`CoinEx API Error: ${json.message || "خطای ناشناخته"}`);
  }

  const candles = json.data || [];
  if (!candles.length) {
    throw new Error(`دیتایی برای ${market} دریافت نشد`);
  }

  return candles.map((k) => ({
    time: new Date(k.created_at).toISOString().slice(0, 16),
    open: parseFloat(k.open),
    high: parseFloat(k.high),
    low: parseFloat(k.low),
    close: parseFloat(k.close),
    volume: parseFloat(k.volume),
  }));
}

/* ------------------------------------------------------------------
   دریافت برترین ارزها از CoinEx (از طریق Python Proxy)
------------------------------------------------------------------ */
export async function fetchCoinExTopCandidates() {
  const res = await fetch("/api/ticker");
  if (!res.ok) throw new Error("خطا در دریافت لیست ارزها از CoinEx");

  const json = await res.json();
  if (json.code !== 0) throw new Error("خطا در پاسخ CoinEx Ticker");

  return (json.data || [])
    .filter((t) => {
      const sym = t.market || "";
      if (!sym.endsWith("USDT")) return false;
      const base = sym.replace("USDT", "");
      if (!TOP_SYMBOLS.includes(base)) return false; // فقط از بین ۱۵۰ ارز برتر
      return true;
    })
    .map((t) => ({
      symbol: t.market,
      price: parseFloat(t.last || 0),
      priceChange: parseFloat(t.change_rate || 0) * 100, // نسبت → درصد
      volume: parseFloat(t.volume || 0),
    }))
    .filter((t) => t.volume > 500_000 && t.price > 0)
    .sort((a, b) => {
      const scoreA = Math.abs(a.priceChange) * Math.log10(Math.max(a.volume, 1));
      const scoreB = Math.abs(b.priceChange) * Math.log10(Math.max(b.volume, 1));
      return scoreB - scoreA;
    })
    .slice(0, 15);
}

/* ------------------------------------------------------------------
   ساخت پرامپت بهینه برای Gemini
------------------------------------------------------------------ */
function buildPrompt(symbol, timeframe, klines) {
  const sliceCount = promptSliceFor(timeframe);
  const recent = klines.slice(-sliceCount);
  const current = recent[recent.length - 1];
  const high = Math.max(...recent.map((k) => k.high));
  const low = Math.min(...recent.map((k) => k.low));
  const avgVol = recent.reduce((s, k) => s + k.volume, 0) / recent.length;

  const candleLines = recent
    .map((k) => `${k.time}|O:${k.open}|H:${k.high}|L:${k.low}|C:${k.close}|V:${Math.round(k.volume)}`)
    .join("\n");

  return `You are a professional crypto technical analyst. Analyze ${symbol} on ${timeframe} timeframe.
This analysis is strictly for educational purposes and simulated environments, NOT financial advice.

MARKET DATA (last ${recent.length} candles):
Price:${current.close} | High:${high} | Low:${low} | AvgVol:${Math.round(avgVol)}

${candleLines}

Respond ONLY with a valid JSON object. Do NOT include any markdown formatting, code fences, or extra text.
All number fields MUST be numeric values (not strings). The "analysis" field must be a single-line string with NO newline characters.

{"trend":"BULLISH or BEARISH or SIDEWAYS","signal":"BUY or SELL or NEUTRAL","confidence":70,"entry":0.0,"stopLoss":0.0,"target1":0.0,"target2":0.0,"riskReward":"1:2","analysis":"تحلیل کامل تکنیکال به فارسی شامل روند، حمایت و مقاومت، الگوی کندل، حجم معاملات و دلیل سیگنال را در یک پاراگراف بنویس."}`;
}

/* ------------------------------------------------------------------
   پاکسازی و پارس JSON از پاسخ هوش مصنوعی
   - حذف کاراکترهای نامعتبر (newline, tab)
   - حذف Markdown code fences
   - حذف trailing commas
------------------------------------------------------------------ */
function parseAIResponse(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("پاسخی از هوش مصنوعی دریافت نشد");
  }

  // مرحله ۱: حذف markdown code fences
  let cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // مرحله ۲: استخراج آبجکت JSON
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Gemini Raw Response (No JSON found):", rawText);
    throw new Error("فرمت پاسخ هوش مصنوعی قابل پردازش نیست — دوباره تلاش کن");
  }

  let jsonText = jsonMatch[0];

  // مرحله ۳: پاکسازی کاراکترهای مخرب
  jsonText = jsonText
    .replace(/[\n\r\t]/g, " ")      // حذف اینترها و تب‌ها
    .replace(/\s+/g, " ")           // فشرده‌سازی فضاهای خالی
    .replace(/,\s*}/g, "}")         // حذف کامای اضافه در انتهای آبجکت
    .replace(/,\s*]/g, "]")         // حذف کامای اضافه در انتهای آرایه
    .replace(/:\s*NaN\b/gi, ": 0")  // تبدیل NaN به 0
    .replace(/:\s*undefined\b/gi, ": 0")  // تبدیل undefined به 0
    .replace(/:\s*null\b/gi, ": 0");      // تبدیل null به 0

  try {
    const parsed = JSON.parse(jsonText);

    // اطمینان از وجود فیلدهای ضروری
    return {
      trend: parsed.trend || "SIDEWAYS",
      signal: parsed.signal || "NEUTRAL",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 50,
      entry: typeof parsed.entry === "number" ? parsed.entry : 0,
      stopLoss: typeof parsed.stopLoss === "number" ? parsed.stopLoss : 0,
      target1: typeof parsed.target1 === "number" ? parsed.target1 : 0,
      target2: typeof parsed.target2 === "number" ? parsed.target2 : 0,
      riskReward: parsed.riskReward || "—",
      analysis: typeof parsed.analysis === "string" ? parsed.analysis : "تحلیلی ارائه نشد.",
    };
  } catch (err) {
    console.error("Gemini Raw Response (Parse Error):", rawText);
    console.error("Cleaned JSON attempt:", jsonText);
    throw new Error("خطا در پردازش پاسخ هوش مصنوعی — لطفاً دوباره تلاش کن");
  }
}

/* ------------------------------------------------------------------
   فراخوانی Gemini API با یک مدل مشخص
------------------------------------------------------------------ */
async function callGemini(model, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1500,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (res.status === 429) {
    return { error429: true };
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { errorMsg: err?.error?.message || `خطای API (${res.status})` };
  }

  const result = await res.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    // بررسی safety filter
    const reason = result?.candidates?.[0]?.finishReason;
    if (reason === "SAFETY") {
      return { errorMsg: "هوش مصنوعی به دلیل محدودیت‌های امنیتی گوگل از ارائه تحلیل خودداری کرده — دوباره تلاش کن" };
    }
    return { errorMsg: "پاسخی از هوش مصنوعی دریافت نشد" };
  }

  return { text };
}

/* ------------------------------------------------------------------
   تحلیل یک ارز با Gemini (با مدیریت کامل خطا و Retry)
------------------------------------------------------------------ */
export async function analyzeSymbol(symbol, timeframe = "1h") {
  if (!GEMINI_API_KEY) {
    throw new Error("کلید API جمینای تنظیم نشده. VITE_GEMINI_API_KEY را در فایل .env بررسی کن.");
  }

  // ✅ بررسی Rate Limit قبل از ارسال درخواست
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.message);
  }

  const limit = fetchLimitFor(timeframe);
  const klines = await fetchCoinExKlines(symbol, timeframe, limit);
  const prompt = buildPrompt(symbol, timeframe, klines);

  // ✅ ثبت درخواست در Rate Limiter
  recordRequest();

  // تلاش با هر مدل (اصلی + فال‌بک)
  let lastError = "";
  for (const model of GEMINI_MODELS) {
    const result = await callGemini(model, prompt);

    if (result.error429) {
      throw new Error(
        `⚠️ محدودیت استفاده از هوش مصنوعی تکمیل شده است.\nنسخه رایگان Gemini API در هر دقیقه حدود ۱۰ درخواست اجازه می‌دهد.\nلطفاً حدود ۱ دقیقه صبر کنید تا ظرفیت توکن‌های شما مجدداً شارژ شود.`
      );
    }

    if (result.errorMsg) {
      lastError = result.errorMsg;
      console.warn(`Model ${model} failed:`, lastError);
      continue; // تلاش با مدل بعدی
    }

    try {
      return parseAIResponse(result.text);
    } catch (parseErr) {
      lastError = parseErr.message;
      console.warn(`Model ${model} parse failed:`, lastError);
      continue; // تلاش با مدل بعدی
    }
  }

  // اگر هیچ مدلی جواب نداد
  throw new Error(lastError || "خطا در ارتباط با سرور هوش مصنوعی — لطفاً دوباره تلاش کن");
}

/* ------------------------------------------------------------------
   سیگنال‌های خودکار: ۳ ارز برتر CoinEx تحلیل می‌شوند
   (ترتیبی برای جلوگیری از Rate Limit)
------------------------------------------------------------------ */
export async function fetchAutoSignals() {
  // ✅ بررسی Rate Limit قبل از شروع — آیا حداقل ۳ درخواست داریم؟
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.message);
  }
  if (rateCheck.remaining < 3) {
    throw new Error(
      `⚠️ ظرفیت فعلی توکن‌ها فقط اجازه ${rateCheck.remaining} تحلیل می‌دهد، ولی سیگنال خودکار نیاز به ۳ تحلیل دارد.\nلطفاً حدود ۱ دقیقه صبر کنید تا ظرفیت کامل شارژ شود.`
    );
  }

  const candidates = await fetchCoinExTopCandidates();
  const top3 = candidates.slice(0, 3);

  // ترتیبی اجرا می‌کنیم (نه موازی) تا Rate Limit را رعایت کنیم
  const results = [];
  for (const c of top3) {
    try {
      const analysis = await analyzeSymbol(c.symbol, "1h");
      results.push({
        symbol: c.symbol,
        price: c.price,
        priceChange: c.priceChange,
        volume: c.volume,
        ...analysis,
        error: null,
      });
    } catch (err) {
      results.push({
        symbol: c.symbol,
        price: c.price,
        priceChange: c.priceChange,
        volume: c.volume,
        error: err.message,
      });
    }

    // تأخیر ۲ ثانیه بین هر درخواست برای جلوگیری از Rate Limit
    if (top3.indexOf(c) < top3.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return results;
}
