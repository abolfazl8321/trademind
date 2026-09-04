import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  LogOut,
  Brain,
  Sparkles,
  RefreshCw,
  Send,
  Target,
  Loader2,
  Zap,
  AlertTriangle,
  Clock,
  Bell,
  BellRing,
} from "lucide-react";
import { supabase } from "./supabase.js";
import {
  TIMEFRAME_OPTIONS,
  TOP_SYMBOLS,
  analyzeSymbol,
  fetchTrueTradeTopCandidates,
  checkRateLimit,
} from "./aiService.js";

/* ---------------------------------------------------------------
   Design tokens (matching App.jsx palette)
--------------------------------------------------------------- */
const C = {
  bg: "#ffffff",
  surface: "#ffffff",
  surface2: "#f8fbf9",
  border: "#2f8f62",
  borderSoft: "#d6e5dc",
  text: "#174b32",
  muted: "#668074",
  faint: "#8a9e8a",
  gold: "#174b32",
  goldSoft: "#e7f0eb",
  green: "#174b32",
  greenSoft: "#d6ead6",
  red: "#b23a3a",
  redSoft: "#fee2e2",
  blue: "#5b8def",
};
const FONT_UI = "'Rubik', 'Vazirmatn', sans-serif";
const FONT_TITLE = "'Lalezar', 'Rubik', sans-serif";
const FONT_MONO = "'Rubik', serif";

const QUICK_SYMBOLS = ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "NEAR"];




/* ---------------------------------------------------------------
   Sub-components
--------------------------------------------------------------- */
function SignalBadge({ signal }) {
  const config = {
    BUY: { bg: "#dcfce7", color: "#15803d", border: "#86efac", label: "خرید (LONG)", Icon: TrendingUp },
    SELL: { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5", label: "فروش (SHORT)", Icon: TrendingDown },
    NEUTRAL: { bg: "#fef9c3", color: "#a16207", border: "#fde68a", label: "بدون سیگنال", Icon: Target },
  };
  const c = config[signal] || config.NEUTRAL;
  const Icon = c.Icon;
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        border: `1.5px solid ${c.border}`,
        padding: "7px 18px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Icon size={15} />
      {c.label}
    </span>
  );
}

function ConfidenceMeter({ value }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const color = v >= 70 ? "#15803d" : v >= 40 ? "#a16207" : "#b91c1c";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          flex: 1,
          height: 8,
          background: "#f0f0f0",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${v}%`,
            height: "100%",
            background: color,
            borderRadius: 999,
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color,
          fontFamily: FONT_MONO,
          minWidth: 38,
          textAlign: "left",
        }}
      >
        {v}%
      </span>
    </div>
  );
}

function PriceLevel({ label, value, color, icon }) {
  return (
    <div
      style={{
        background: "#fafafa",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontWeight: 600,
        }}
      >
        {icon}
        {label}
      </div>
      <div
        style={{
          fontSize: "clamp(16px, 2.5vw, 20px)",
          fontWeight: 700,
          fontFamily: FONT_MONO,
          color: color || C.text,
          direction: "ltr",
        }}
      >
        {typeof value === "number"
          ? value.toLocaleString("en-US", { maximumFractionDigits: 8 })
          : "—"}
      </div>
    </div>
  );
}

function AIChart({ klines, entry, target1, target2, stopLoss, fibLevels }) {
  const canvasRef = React.useRef(null);
  
  React.useEffect(() => {
    if (!klines || klines.length === 0 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // پیدا کردن بازه قیمت‌ها
    const prices = klines.map(k => [k.low, k.high]).flat();
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1 || 1;
    const minP = minPrice - padding;
    const maxP = maxPrice + padding;
    const rng = maxP - minP;
    
    const getY = (price) => h - ((price - minP) / rng) * h;
    const getX = (index) => (w / klines.length) * (index + 0.5);
    const cw = (w / klines.length) * 0.6;
    
    // رسم کندل‌ها
    klines.forEach((k, i) => {
      const x = getX(i);
      const isUp = k.close >= k.open;
      ctx.strokeStyle = isUp ? '#22c55e' : '#ef4444';
      ctx.fillStyle = isUp ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 1.5;
      
      // Shadow (wick)
      ctx.beginPath();
      ctx.moveTo(x, getY(k.high));
      ctx.lineTo(x, getY(k.low));
      ctx.stroke();
      
      // Body
      const y1 = getY(k.open);
      const y2 = getY(k.close);
      const bodyH = Math.max(Math.abs(y1 - y2), 1);
      ctx.fillRect(x - cw/2, Math.min(y1, y2), cw, bodyH);
    });
    
    // تابع رسم خطوط تحلیلی
    const drawLine = (y, color, label) => {
      if (y < 0 || y > h) return;
      ctx.strokeStyle = color;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = color;
      ctx.font = '12px "Rubik", sans-serif';
      ctx.fontWeight = 'bold';
      ctx.fillText(label, 5, y - 6);
    };
    
    if (entry) drawLine(getY(entry), '#2563eb', 'نقطه ورود');
    if (stopLoss) drawLine(getY(stopLoss), '#b91c1c', 'حد ضرر');
    if (target1) drawLine(getY(target1), '#15803d', 'تارگت ۱');
    if (target2) drawLine(getY(target2), '#15803d', 'تارگت ۲');
    
    if (fibLevels && fibLevels.length > 0) {
       fibLevels.forEach(fib => {
         if (fib.price && fib.level) {
           drawLine(getY(fib.price), '#a16207', `Fibo ${fib.level}`);
         }
       });
    }
  }, [klines, entry, target1, target2, stopLoss, fibLevels]);
  
  if (!klines || klines.length === 0) return null;
  return (
    <div style={{ marginTop: 18, marginBottom: 18, border: '1px solid #e5e7eb', borderRadius: 14, background: '#f8fafc', padding: '12px 0' }}>
       <div style={{ padding: '0 16px', fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
         <TrendingUp size={14} />
         چارت تحلیلی با نواحی مهم
       </div>
       <canvas 
         ref={canvasRef} 
         width={800} 
         height={320} 
         style={{ width: '100%', height: 220, display: 'block', direction: 'ltr' }} 
       />
    </div>
  );
}

function AnalysisCard({ data }) {
  if (data.error) {
    return (
      <div
        style={{
          border: "1.5px solid #fca5a5",
          borderRadius: 18,
          padding: 22,
          background: "#fef2f2",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <AlertTriangle size={18} color="#b91c1c" />
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#b91c1c",
              fontFamily: FONT_MONO,
            }}
          >
            {data.symbol}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "#991b1b", lineHeight: 1.8 }}>
          {data.error}
        </div>
      </div>
    );
  }

  const borderColor =
    data.signal === "BUY"
      ? "#22c55e"
      : data.signal === "SELL"
        ? "#ef4444"
        : "#eab308";

  return (
    <div
      style={{
        border: `2px solid ${borderColor}`,
        borderRadius: 18,
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        animation: "ai-fade-in 0.5s ease both",
      }}
    >
      {/* Card header */}
      <div
        style={{
          background: `${borderColor}0C`,
          padding: "18px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          borderBottom: `1px solid ${borderColor}28`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: C.text,
              fontFamily: FONT_MONO,
              direction: "ltr",
              textAlign: "left",
            }}
          >
            {data.symbol}
          </div>
          {data.price != null && (
            <div
              style={{
                fontSize: 13,
                color: C.muted,
                marginTop: 4,
                direction: "ltr",
                textAlign: "left",
              }}
            >
              قیمت:{" "}
              <span style={{ fontWeight: 700, color: C.text }}>
                ${data.price?.toLocaleString("en-US", { maximumFractionDigits: 6 })}
              </span>
              {data.priceChange != null && (
                <span
                  style={{
                    color: data.priceChange >= 0 ? "#15803d" : "#b91c1c",
                    marginLeft: 8,
                    fontWeight: 600,
                  }}
                >
                  ({data.priceChange >= 0 ? "+" : ""}
                  {data.priceChange?.toFixed(2)}%)
                </span>
              )}
            </div>
          )}
        </div>
        <SignalBadge signal={data.signal} />
      </div>

      {/* Card body */}
      <div style={{ padding: "18px 22px" }}>
        
        {/* Chart */}
        {data.klines && (
          <AIChart 
            klines={data.klines} 
            entry={data.entry} 
            target1={data.target1} 
            target2={data.target2} 
            stopLoss={data.stopLoss} 
            fibLevels={data.fibLevels} 
          />
        )}

        {/* Confidence */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{ fontSize: 12, color: C.muted, marginBottom: 7, fontWeight: 600 }}
          >
            میزان اطمینان تحلیل
          </div>
          <ConfidenceMeter value={data.confidence} />
        </div>

        {/* Price levels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <PriceLevel
            label="نقطه ورود"
            value={data.entry}
            color="#2563eb"
            icon={<Target size={12} />}
          />
          <PriceLevel
            label="حد ضرر (SL)"
            value={data.stopLoss}
            color="#b91c1c"
            icon={<AlertTriangle size={12} />}
          />
          <PriceLevel
            label="تارگت ۱"
            value={data.target1}
            color="#15803d"
            icon={<Zap size={12} />}
          />
          <PriceLevel
            label="تارگت ۲"
            value={data.target2}
            color="#15803d"
            icon={<Zap size={12} />}
          />
        </div>

        {/* Risk-Reward */}
        {data.riskReward && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: C.muted,
              marginBottom: 16,
              background: C.surface2,
              padding: "6px 14px",
              borderRadius: 999,
              border: `1px solid ${C.borderSoft}`,
            }}
          >
            نسبت ریسک/ریوارد:
            <span style={{ fontWeight: 700, color: C.text, fontFamily: FONT_MONO }}>
              {data.riskReward}
            </span>
          </div>
        )}

        {/* Analysis text */}
        {data.analysis && (
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 18,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: C.gold,
                fontWeight: 700,
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={14} />
              تحلیل تکنیکال هوش مصنوعی
            </div>
            <div
              dir="rtl"
              style={{
                fontSize: "clamp(14px, 2.5vw, 16px)",
                color: C.text,
                lineHeight: 2.5,
                whiteSpace: "pre-wrap",
                textAlign: "right",
              }}
            >
              {data.analysis}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Loading skeleton
--------------------------------------------------------------- */
function LoadingSkeleton() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            border: `1.5px solid ${C.borderSoft}`,
            borderRadius: 18,
            padding: 24,
            animation: "ai-pulse 1.5s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 100, height: 20, background: C.surface2, borderRadius: 6 }} />
            <div style={{ width: 80, height: 28, background: C.surface2, borderRadius: 999 }} />
          </div>
          <div style={{ width: "60%", height: 10, background: C.surface2, borderRadius: 6, marginBottom: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[1, 2, 3, 4].map((j) => (
              <div key={j} style={{ height: 60, background: C.surface2, borderRadius: 12 }} />
            ))}
          </div>
          <div style={{ width: "100%", height: 80, background: C.surface2, borderRadius: 12 }} />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------
   Main AI Analysis page
--------------------------------------------------------------- */
export default function AIAnalysis({ user, onBack }) {
  const [aiTab, setAiTab] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // وضعیت دسترسی نوتیفیکیشن
  const [notifPermission, setNotifPermission] = useState(() =>
    "Notification" in window ? Notification.permission : "unsupported"
  );

  // درخواست اولیه مجوز در صورت امکان
  React.useEffect(() => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => setNotifPermission(perm)).catch(() => {});
      }
    }
  }, []);

  // پخش صدای زنگ اعلان با کیفیت بالا (چهار نت هارمونیک دلنشین)
  const playSuccessSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // سه‌گانه/چهارگانه نت زیبا (شبیه به اعلان مدرن تریدینگ‌ویو)
      const notes = [
        { freq: 523.25, time: 0.00, dur: 0.12 }, // C5
        { freq: 659.25, time: 0.10, dur: 0.14 }, // E5
        { freq: 783.99, time: 0.22, dur: 0.16 }, // G5
        { freq: 1046.5, time: 0.36, dur: 0.45 }, // C6
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.25, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {
      console.warn("Web Audio API error:", e);
    }
  };

  // ارسال نوتیفیکیشن سیستمی مرورگر به ویندوز
  const showSystemNotification = (title, body) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        const notif = new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "trademind-notification",
          silent: false,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn("System Notification error:", e);
      }
    }
  };

  // فعال‌سازی دستی و تست اعلان و صدا
  const handleToggleNotification = async () => {
    if (!("Notification" in window)) {
      alert("مرورگر شما از قابلیت اعلان‌های سیستمی پشتیبانی نمی‌کند.");
      return;
    }

    try {
      let currentPerm = Notification.permission;
      if (currentPerm !== "granted") {
        currentPerm = await Notification.requestPermission();
        setNotifPermission(currentPerm);
      }

      // تست صدا و نوتیفیکیشن
      playSuccessSound();

      if (currentPerm === "granted") {
        showSystemNotification(
          "🔔 اعلان‌های TradeMind فعال است",
          "صدای نوتیفیکیشن و اعلان‌های سیستمی برای سیگنال خودکار و تحلیل سفارشی با موفقیت فعال شد."
        );
      } else if (currentPerm === "denied") {
        alert("اعلان‌ها در مرورگر مسدود شده‌اند. لطفاً از کنار آدرس سایت (آیکون قفل) دسترسی نوتیفیکیشن را روی Allow بگذارید.");
      }
    } catch (e) {
      console.warn("Error requesting notification permission:", e);
    }
  };

  // Auto signals
  const [autoSignals, setAutoSignals] = useState([]);


  const handleAutoSignals = async () => {
    // درخواست دسترسی اعلان در تعامل کلیک کاربر
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => setNotifPermission(perm)).catch(() => {});
    }

    // بررسی Rate Limit قبل از شروع
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      setError(rateCheck.message);
      return;
    }
    
    setLoading(true);
    setError("");
    setAutoSignals([]);
    
    try {
      const candidates = await fetchTrueTradeTopCandidates();
      const top3 = candidates.slice(0, 3);
      
      for (let i = 0; i < top3.length; i++) {
        const c = top3[i];
        try {
          const analysis = await analyzeSymbol(c.symbol, "1h", false);
          setAutoSignals(prev => [...prev, {
            symbol: c.symbol,
            price: c.price,
            priceChange: c.priceChange,
            volume: c.volume,
            ...analysis,
            error: null,
          }]);
        } catch (err) {
          setAutoSignals(prev => [...prev, {
            symbol: c.symbol,
            price: c.price,
            priceChange: c.priceChange,
            volume: c.volume,
            error: err.message,
          }]);
        }
        
        // Wait between requests if not the last one
        if (i < top3.length - 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      // پخش صدا و ارسال نوتیفیکیشن به ویندوز
      playSuccessSound();
      showSystemNotification(
        "⚡ سیگنال‌های هوشمند TradeMind",
        "تحلیل خودکار ۳ ارز برتر بازار با موفقیت توسط هوش مصنوعی انجام شد."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Custom analysis
  const [customSymbol, setCustomSymbol] = useState("");
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [customTimeframe, setCustomTimeframe] = useState("1h");
  const [useFibonacci, setUseFibonacci] = useState(false);
  const [customResult, setCustomResult] = useState(null);

  const handleCustomAnalysis = async () => {
    const raw = customSymbol.trim();
    if (!raw) {
      setError("لطفاً نماد ارز رو وارد کن (مثل BTC یا ETHUSDT)");
      return;
    }

    // درخواست دسترسی اعلان در تعامل کلیک کاربر
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => setNotifPermission(perm)).catch(() => {});
    }

    // بررسی Rate Limit قبل از شروع
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      setError(rateCheck.message);
      return;
    }
    setLoading(true);
    setError("");
    setCustomResult(null);
    const sym = raw.toUpperCase();
    const finalSymbol = sym.includes("USDT") ? sym : sym + "USDT";
    try {
      const analysis = await analyzeSymbol(finalSymbol, customTimeframe, useFibonacci);
      setCustomResult({ symbol: finalSymbol, ...analysis });

      // پخش صدا و ارسال نوتیفیکیشن به ویندوز
      playSuccessSound();
      const signalText =
        analysis.signal === "BUY"
          ? "خرید (LONG)"
          : analysis.signal === "SELL"
          ? "فروش (SHORT)"
          : "بدون سیگنال";
      showSystemNotification(
        `🎯 تحلیل ارز ${finalSymbol} آماده است`,
        `سیگنال: ${signalText} | اطمینان: ${analysis.confidence}% | تایم‌فریم: ${customTimeframe}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabOptions = [
    { key: "auto", label: "سیگنال‌ خودکار", icon: Zap },
    { key: "custom", label: "تحلیل سفارشی", icon: Send },
  ];

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: FONT_UI,
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
        paddingBottom: 60,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lalezar&family=Rubik:ital,wght@0,300..900;1,300..900&display=swap');
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ai-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.85; } }
        @keyframes ai-fade-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${C.borderSoft}`,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onBack}
            style={{
              background: C.surface2,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: C.text,
              flexShrink: 0,
            }}
            title="بازگشت به داشبورد"
          >
            <ArrowRight size={17} />
          </button>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "#5b8def14",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Brain size={16} color="#5b8def" />
          </div>
          <div
            style={{
              fontFamily: FONT_TITLE,
              fontSize: "clamp(20px, 4vw, 24px)",
              fontWeight: 400,
            }}
          >
            تحلیل هوشمند
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* دکمه وضعیت و تست نوتیفیکیشن */}
          <button
            onClick={handleToggleNotification}
            title={
              notifPermission === "granted"
                ? "اعلان‌های سیستمی و صدا فعال هستند (برای تست صدا و نوتیفیکیشن کلیک کنید)"
                : "برای فعال‌سازی صدای نوتیفیکیشن و ارسال اعلان به ویندوز کلیک کنید"
            }
            style={{
              background: notifPermission === "granted" ? "#ecfdf5" : "#f8fafc",
              border: `1.5px solid ${notifPermission === "granted" ? "#86efac" : C.border}`,
              color: notifPermission === "granted" ? "#15803d" : C.muted,
              borderRadius: 8,
              padding: "7px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: FONT_UI,
              transition: "all 0.2s ease",
            }}
          >
            {notifPermission === "granted" ? (
              <>
                <BellRing size={15} color="#15803d" />
                <span>اعلان و صدا: فعال (تست)</span>
              </>
            ) : (
              <>
                <Bell size={15} color={C.muted} />
                <span>فعال‌سازی اعلان و صدا 🔔</span>
              </>
            )}
          </button>

          <button
            onClick={() => supabase?.auth.signOut()}
            title="خروج"
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.muted,
              borderRadius: 8,
              padding: 7,
              cursor: "pointer",
              display: "flex",
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "16px 20px 0",
          flexWrap: "wrap",
        }}
      >
        {tabOptions.map((t) => {
          const Icon = t.icon;
          const active = aiTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setAiTab(t.key);
                setError("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 18px",
                borderRadius: 9,
                border: `1.5px solid ${active ? "#5b8def" : C.border}`,
                background: active ? "#5b8def" : "#ffffff",
                color: active ? "#ffffff" : C.text,
                fontFamily: FONT_UI,
                fontSize: 13,
                cursor: "pointer",
                fontWeight: active ? 700 : 500,
                transition: "all 0.2s ease",
              }}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          padding: "24px 20px",
        }}
      >
        {/* Error alert */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1.5px solid #fca5a5",
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 22,
              color: "#b91c1c",
              fontSize: 13,
              lineHeight: 1.8,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        {/* ========== AUTO SIGNALS TAB ========== */}
        {aiTab === "auto" ? (
          <>
            <div style={{ marginBottom: 22 }}>
              <div
                style={{
                  fontFamily: FONT_TITLE,
                  fontSize: "clamp(22px, 4.5vw, 28px)",
                  marginBottom: 10,
                }}
              >
                ⚡ سیگنال‌های هوشمند
              </div>
              <p
                style={{
                  color: C.muted,
                  fontSize: 14,
                  lineHeight: 2,
                  margin: 0,
                }}
              >
                هوش مصنوعی ۳ ارز با بیشترین پتانسیل رو از بین ارزهای بازار پیدا
                می‌کنه و تحلیل تکنیکال حرفه‌ای ارائه میده. داده‌ها مستقیم از
                صرافی THE TRUE TRADE دریافت و توسط Gemini AI تحلیل می‌شن.
              </p>
            </div>

            <button
              onClick={handleAutoSignals}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "15px 32px",
                borderRadius: 14,
                border: "none",
                background: loading
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #5b8def, #3b6bdf)",
                color: "#ffffff",
                fontFamily: FONT_UI,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "default" : "pointer",
                marginBottom: 26,
                boxShadow: loading
                  ? "none"
                  : "0 6px 20px rgba(91, 141, 239, 0.3)",
                transition: "all 0.25s ease",
              }}
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  در حال تحلیل بازار... (ممکنه چند ثانیه طول بکشه)
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  دریافت سیگنال‌های هوشمند
                </>
              )}
            </button>

            {loading && <LoadingSkeleton />}

            {autoSignals.length > 0 && (
              <div style={{ display: "grid", gap: 22 }}>
                {autoSignals.map((s, i) => (
                  <AnalysisCard key={`${s.symbol}-${i}`} data={s} />
                ))}
              </div>
            )}
          </>
        ) : (
          /* ========== CUSTOM ANALYSIS TAB ========== */
          <>
            <div style={{ marginBottom: 22 }}>
              <div
                style={{
                  fontFamily: FONT_TITLE,
                  fontSize: "clamp(22px, 4.5vw, 28px)",
                  marginBottom: 10,
                }}
              >
                🔍 تحلیل سفارشی
              </div>
              <p
                style={{
                  color: C.muted,
                  fontSize: 14,
                  lineHeight: 2,
                  margin: 0,
                }}
              >
                نماد ارز و تایم‌فریم دلخواهت رو انتخاب کن تا هوش مصنوعی تحلیل
                تکنیکال حرفه‌ای با نقطه ورود، حد ضرر و تارگت ارائه بده.
              </p>
            </div>

            {/* Quick symbol chips */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              {QUICK_SYMBOLS.map((sym) => {
                const active =
                  customSymbol.toUpperCase() === sym ||
                  customSymbol.toUpperCase() === sym + "USDT";
                return (
                  <button
                    key={sym}
                    onClick={() => setCustomSymbol(sym)}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 999,
                      border: `1.5px solid ${active ? "#5b8def" : C.border}`,
                      background: active ? "#5b8def" : C.surface2,
                      color: active ? "#fff" : C.text,
                      fontSize: 12,
                      fontFamily: FONT_UI,
                      cursor: "pointer",
                      fontWeight: 600,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>

            {/* Input row */}
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 26,
                alignItems: "flex-end",
              }}
            >
              <div style={{ flex: "1 1 200px", position: "relative" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: C.muted,
                    marginBottom: 7,
                    fontWeight: 600,
                  }}
                >
                  نماد ارز
                </label>
                <input
                  type="text"
                  placeholder="مثلاً BTC یا ETHUSDT"
                  value={customSymbol}
                  onChange={(e) => {
                    setCustomSymbol(e.target.value.toUpperCase());
                    setShowSymbolDropdown(true);
                  }}
                  onFocus={() => setShowSymbolDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSymbolDropdown(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setShowSymbolDropdown(false);
                      if (!loading) handleCustomAnalysis();
                    }
                  }}
                  dir="ltr"
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 11,
                    fontSize: 15,
                    fontFamily: FONT_UI,
                    color: C.text,
                    outline: "none",
                    background: "#ffffff",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s ease",
                  }}
                />
                {showSymbolDropdown && (
                  <div 
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: 8,
                      background: "#fff",
                      border: `1.5px solid ${C.border}`,
                      borderRadius: 11,
                      maxHeight: 220,
                      overflowY: "auto",
                      zIndex: 100,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    }}
                  >
                    {TOP_SYMBOLS.filter(sym => sym.includes(customSymbol.toUpperCase())).map((sym) => (
                      <div 
                        key={sym}
                        onClick={() => {
                          setCustomSymbol(sym);
                          setShowSymbolDropdown(false);
                        }}
                        style={{
                          padding: "10px 16px",
                          cursor: "pointer",
                          fontSize: 14,
                          fontFamily: FONT_UI,
                          color: C.text,
                          borderBottom: "1px solid #f0f0f0",
                          textAlign: "left",
                          direction: "ltr"
                        }}
                        onMouseEnter={(e) => e.target.style.background = C.surface2}
                        onMouseLeave={(e) => e.target.style.background = "#fff"}
                      >
                        {sym}
                      </div>
                    ))}
                    {TOP_SYMBOLS.filter(sym => sym.includes(customSymbol.toUpperCase())).length === 0 && (
                      <div style={{ padding: "10px 16px", fontSize: 13, color: C.muted, textAlign: "center" }}>
                        نتیجه‌ای یافت نشد
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ flex: "0 1 170px" }}>
                <label
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    marginBottom: 7,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Clock size={12} />
                  تایم‌فریم
                </label>
                <select
                  value={customTimeframe}
                  onChange={(e) => setCustomTimeframe(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 11,
                    fontSize: 15,
                    fontFamily: FONT_UI,
                    color: C.text,
                    outline: "none",
                    background: "#ffffff",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  {TIMEFRAME_OPTIONS.map((tf) => (
                    <option key={tf.value} value={tf.value}>
                      {tf.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCustomAnalysis}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "13px 28px",
                  borderRadius: 11,
                  border: "none",
                  background: loading
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #5b8def, #3b6bdf)",
                  color: "#ffffff",
                  fontFamily: FONT_UI,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading ? "default" : "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: loading
                    ? "none"
                    : "0 4px 14px rgba(91, 141, 239, 0.3)",
                  transition: "all 0.25s ease",
                }}
              >
                {loading ? (
                  <>
                    <Loader2
                      size={16}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    تحلیل...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    تحلیل کن
                  </>
                )}
              </button>
            </div>

            {/* Fibonacci Checkbox */}
            <div style={{ marginBottom: 26, display: 'flex', alignItems: 'center', gap: 8 }}>
               <input 
                 type="checkbox" 
                 id="fibCheckbox" 
                 checked={useFibonacci}
                 onChange={(e) => setUseFibonacci(e.target.checked)}
                 style={{ width: 18, height: 18, accentColor: '#5b8def', cursor: 'pointer' }}
               />
               <label htmlFor="fibCheckbox" style={{ fontSize: 14, color: C.text, cursor: 'pointer', fontWeight: 600 }}>
                 اعمال رسم سطوح فیبوناچی (Fibonacci) در چارت تحلیلی
               </label>
            </div>

            {loading && !customResult && (
              <div
                style={{
                  border: `1.5px solid ${C.borderSoft}`,
                  borderRadius: 18,
                  padding: 28,
                  textAlign: "center",
                  animation: "ai-pulse 1.5s ease-in-out infinite",
                }}
              >
                <Brain
                  size={36}
                  color="#5b8def"
                  style={{ marginBottom: 12, opacity: 0.7 }}
                />
                <div
                  style={{
                    fontSize: 15,
                    color: C.muted,
                    fontWeight: 600,
                  }}
                >
                  هوش مصنوعی در حال تحلیل بازار...
                </div>
                <div
                  style={{ fontSize: 12, color: C.faint, marginTop: 6 }}
                >
                  داده‌ها از THE TRUE TRADE دریافت و توسط Gemini AI تحلیل می‌شن
                </div>
              </div>
            )}

            {customResult && <AnalysisCard data={customResult} />}
          </>
        )}

        {/* Disclaimer */}
        <div
          style={{
            marginTop: 36,
            padding: "16px 20px",
            background: "#fffbeb",
            border: "1.5px solid #fde68a",
            borderRadius: 14,
            fontSize: 12,
            color: "#92400e",
            lineHeight: 2,
            textAlign: "right",
          }}
        >
          ⚠️ <strong>هشدار مهم:</strong> تحلیل‌ها توسط هوش مصنوعی و بر اساس
          داده‌های تکنیکال ارائه می‌شوند و به هیچ وجه توصیه مالی محسوب نمی‌شوند.
          مسئولیت تمامی تصمیمات معاملاتی بر عهده خود شماست. همیشه اصول مدیریت
          ریسک رو رعایت کنید و با سرمایه‌ای که توان از دست دادنش رو دارید معامله
          کنید.
        </div>
      </div>
    </div>
  );
}
