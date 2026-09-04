/* ---------------------------------------------------------------
   AI Service — THE TRUE TRADE Market Data + Google Gemini Analysis
   ---------------------------------------------------------------
   ✅ داده کندل: /api/kline  ← Vercel Proxy (CORS-free)
   ✅ تحلیل AI: Google Gemini 3.6 Flash (با فال‌بک به 2.5 Flash) از طریق Vercel
   ✅ مدیریت توکن: Rate Limiter سمت کلاینت + مدیریت 429
   ✅ پاکسازی JSON: حذف کاراکترهای نامعتبر + Retry خودکار
--------------------------------------------------------------- */

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
------------------------------------------------------------------ */
const RATE_LIMIT = {
  maxRequestsPerMinute: 8,
  requestTimestamps: [],
  dailyCount: 0,
  dailyResetTime: 0,
  maxDailyRequests: 1400, 
};

export function checkRateLimit() {
  const now = Date.now();

  if (now - RATE_LIMIT.dailyResetTime > 24 * 60 * 60 * 1000) {
    RATE_LIMIT.dailyCount = 0;
    RATE_LIMIT.dailyResetTime = now;
  }

  if (RATE_LIMIT.dailyCount >= RATE_LIMIT.maxDailyRequests) {
    const resetIn = Math.ceil((RATE_LIMIT.dailyResetTime + 24 * 60 * 60 * 1000 - now) / 1000 / 60 / 60);
    return {
      allowed: false,
      waitSeconds: 0,
      message: `⚠️ سقف درخواست‌های روزانه (${RATE_LIMIT.maxDailyRequests} تحلیل) تمام شده است.\nتوکن‌های شما حدود ${resetIn} ساعت دیگر مجدداً شارژ می‌شوند (هر ۲۴ ساعت ریست می‌شود).`,
    };
  }

  RATE_LIMIT.requestTimestamps = RATE_LIMIT.requestTimestamps.filter(
    (ts) => now - ts < 60_000
  );

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

function recordRequest() {
  RATE_LIMIT.requestTimestamps.push(Date.now());
  RATE_LIMIT.dailyCount++;
}

/* ------------------------------------------------------------------
   نگاشت Timeframe
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
  "ICP", "VET", "FIL", "RNDR", "AR", "OP", "ARB", "AAVE", "SUI", "APT"
];

function fetchLimitFor(interval) {
  const shortTFs = ["1m", "3m", "5m", "15m", "30m"];
  return shortTFs.includes(interval) ? 70 : 100;
}

function promptSliceFor(interval) {
  return fetchLimitFor(interval); // Feed all fetched candles to the AI
}

/* ------------------------------------------------------------------
   دریافت کندل تاریخی (پروکسی Vercel)
------------------------------------------------------------------ */
export async function fetchHistoricalKlines(symbol, interval = "1h", limit = 70) {
  const period = PERIOD_MAP[interval] || "1hour";
  const market = symbol.toUpperCase().replace("/", "");

  const url = new URL("/api/kline", window.location.origin);
  url.searchParams.set("market", market);
  url.searchParams.set("period", period);
  url.searchParams.set("limit", String(Math.min(limit, 1000)));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`خطا در دریافت داده مارکت: ${res.status}`);
  }

  const json = await res.json();

  if (json.code !== 0) {
    throw new Error(`THE TRUE TRADE API Error: ${json.message || "خطای ناشناخته"}`);
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
   دریافت برترین ارزها (THE TRUE TRADE)
------------------------------------------------------------------ */
export async function fetchTrueTradeTopCandidates() {
  const res = await fetch("/api/ticker");
  if (!res.ok) throw new Error("خطا در دریافت لیست ارزها از THE TRUE TRADE");

  const json = await res.json();
  if (json.code !== 0) throw new Error("خطا در پاسخ Ticker");

  return (json.data || [])
    .filter((t) => {
      const sym = t.market || "";
      if (!sym.endsWith("USDT")) return false;
      const base = sym.replace("USDT", "");
      if (!TOP_SYMBOLS.includes(base)) return false; 
      return true;
    })
    .map((t) => ({
      symbol: t.market,
      price: parseFloat(t.last || 0),
      priceChange: parseFloat(t.change_rate || 0) * 100, 
      volume: parseFloat(t.volume || 0),
    }))
    .filter((t) => t.volume > 500_000 && t.price > 0)
    .sort((a, b) => {
      const scoreA = Math.abs(a.priceChange) * Math.log10(Math.max(a.volume, 1));
      const scoreB = Math.abs(b.priceChange) * Math.log10(Math.max(b.volume, 1));
      return scoreB - scoreA;
    })
    .slice(0, 30);
}

/* ------------------------------------------------------------------
   ساخت پرامپت بهینه برای Gemini
------------------------------------------------------------------ */
function buildPrompt(symbol, timeframe, klines, useFibonacci) {
  const sliceCount = promptSliceFor(timeframe);
  const recent = klines.slice(-sliceCount);
  const current = recent[recent.length - 1];
  const high = Math.max(...recent.map((k) => k.high));
  const low = Math.min(...recent.map((k) => k.low));
  const avgVol = recent.reduce((s, k) => s + k.volume, 0) / recent.length;

  const candleLines = recent
    .map((k) => `${k.time}|O:${k.open}|H:${k.high}|L:${k.low}|C:${k.close}|V:${Math.round(k.volume)}`)
    .join("\n");

  const fibInstruction = useFibonacci 
    ? `\n- Calculate key Fibonacci retracement/extension levels and include them in the "fibLevels" array.` 
    : `\n- "fibLevels" MUST be an empty array [].`;

  return `You are a professional, highly experienced crypto technical analyst. Analyze ${symbol} on ${timeframe} timeframe.
This analysis is strictly for educational purposes and simulated environments, NOT financial advice.

MARKET DATA (last ${recent.length} candles):
Price:${current.close} | High:${high} | Low:${low} | AvgVol:${Math.round(avgVol)}

${candleLines}

Analyze the data with EXTREME precision based on these advanced concepts:
1. Technical Analysis & Trend Direction (جهت روند)
2. Important Liquidity Zones (نواحی مهم نقدینگی)
3. PRZ (Potential Reversal Zones - نواحی پی آر زد)
4. Chart Patterns & Formations (الگوها و پترن‌ها)
5. Pure Price Action Analysis (تحلیل پرایس اکشن)
6. Key Level Breakouts and Retests (شکست ناحیه مهم و ریتست)
7. Candlestick Confirmations for the Signal (تاییدیه کندلی برای سیگنال)
${fibInstruction}

Respond ONLY with a valid JSON object. Do NOT include any markdown formatting, code fences, or extra text.
All number fields MUST be numeric values (not strings).

{
  "trend": "BULLISH or BEARISH or SIDEWAYS",
  "signal": "BUY or SELL or NEUTRAL",
  "confidence": 85,
  "entry": 0.0,
  "stopLoss": 0.0,
  "target1": 0.0,
  "target2": 0.0,
  "riskReward": "1:2",
  "fibLevels": [ {"level": "0.618", "price": 0.0} ],
  "analysis": "متن دقیق، حرفه‌ای و کامل تحلیل به زبان فارسی شامل موارد بالا (پرایس اکشن، نقدینگی، تاییدیه کندلی و غیره). متن یکپارچه بدون کاراکترهای خط جدید (Newline) باشد."
}`;
}

/* ------------------------------------------------------------------
   پاکسازی و پارس JSON از پاسخ هوش مصنوعی
------------------------------------------------------------------ */
function parseAIResponse(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("پاسخی از هوش مصنوعی دریافت نشد");
  }

  let cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Gemini Raw Response (No JSON found):", rawText);
    throw new Error("فرمت پاسخ هوش مصنوعی قابل پردازش نیست — دوباره تلاش کن");
  }

  let jsonText = jsonMatch[0];

  jsonText = jsonText
    .replace(/[\n\r\t]/g, " ")      
    .replace(/\s+/g, " ")           
    .replace(/,\s*}/g, "}")         
    .replace(/,\s*]/g, "]")         
    .replace(/:\s*NaN\b/gi, ": 0")  
    .replace(/:\s*undefined\b/gi, ": 0")  
    .replace(/:\s*null\b/gi, ": 0");      

  try {
    const parsed = JSON.parse(jsonText);

    return {
      trend: parsed.trend || "SIDEWAYS",
      signal: parsed.signal || "NEUTRAL",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 50,
      entry: typeof parsed.entry === "number" ? parsed.entry : 0,
      stopLoss: typeof parsed.stopLoss === "number" ? parsed.stopLoss : 0,
      target1: typeof parsed.target1 === "number" ? parsed.target1 : 0,
      target2: typeof parsed.target2 === "number" ? parsed.target2 : 0,
      riskReward: parsed.riskReward || "—",
      fibLevels: Array.isArray(parsed.fibLevels) ? parsed.fibLevels : [],
      analysis: typeof parsed.analysis === "string" ? parsed.analysis : "تحلیلی ارائه نشد.",
    };
  } catch (err) {
    console.error("Gemini Raw Response (Parse Error):", rawText);
    console.error("Cleaned JSON attempt:", jsonText);
    throw new Error("خطا در پردازش پاسخ هوش مصنوعی — لطفاً دوباره تلاش کن");
  }
}

/* ------------------------------------------------------------------
   فراخوانی Gemini API از طریق Vercel Serverless Function
------------------------------------------------------------------ */
async function callGeminiViaProxy(model, prompt) {
  const url = new URL("/api/analyze", window.location.origin);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt }),
  });

  if (res.status === 429) {
    return { error429: true };
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { errorMsg: err?.errorMsg || `خطای API (${res.status})` };
  }

  const result = await res.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    const reason = result?.candidates?.[0]?.finishReason;
    if (reason === "SAFETY") {
      return { errorMsg: "هوش مصنوعی به دلیل محدودیت‌های امنیتی گوگل از ارائه تحلیل خودداری کرده — دوباره تلاش کن" };
    }
    return { errorMsg: "پاسخی از هوش مصنوعی دریافت نشد" };
  }

  return { text };
}

/* ------------------------------------------------------------------
   تحلیل یک ارز با Gemini 
------------------------------------------------------------------ */
export async function analyzeSymbol(symbol, timeframe = "1h", useFibonacci = false) {
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.message);
  }

  const limit = fetchLimitFor(timeframe);
  const klines = await fetchHistoricalKlines(symbol, timeframe, limit);
  const prompt = buildPrompt(symbol, timeframe, klines, useFibonacci);

  recordRequest();

  let lastError = "";
  for (const model of GEMINI_MODELS) {
    const result = await callGeminiViaProxy(model, prompt);

    if (result.error429) {
      throw new Error(
        `⚠️ محدودیت استفاده از هوش مصنوعی تکمیل شده است.\nنسخه رایگان Gemini API در هر دقیقه حدود ۱۰ درخواست اجازه می‌دهد.\nلطفاً حدود ۱ دقیقه صبر کنید تا ظرفیت توکن‌های شما مجدداً شارژ شود.`
      );
    }

    if (result.errorMsg) {
      lastError = result.errorMsg;
      console.warn(`Model ${model} failed:`, lastError);
      continue;
    }

    try {
      const parsed = parseAIResponse(result.text);
      return { ...parsed, klines };
    } catch (parseErr) {
      lastError = parseErr.message;
      console.warn(`Model ${model} parse failed:`, lastError);
      continue;
    }
  }

  throw new Error(lastError || "خطا در ارتباط با سرور هوش مصنوعی — لطفاً دوباره تلاش کن");
}


