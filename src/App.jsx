import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  History as HistoryIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  X,
  Trash2,
  Sparkles,
  Loader2,
  LogOut,
} from "lucide-react";
import { supabase, supabaseConfigStatus } from "./supabase.js";

/* ---------------------------------------------------------------
   Design tokens — dark trading-terminal palette
--------------------------------------------------------------- */
const C = {
  bg: "#0B0E14",
  surface: "#12161F",
  surface2: "#171C28",
  border: "#232935",
  borderSoft: "#1B212C",
  text: "#E7EAEF",
  muted: "#8892A0",
  faint: "#565F6E",
  gold: "#D8A94E",
  goldSoft: "#3A2F1C",
  green: "#3FBE7B",
  greenSoft: "#123222",
  red: "#E5584F",
  redSoft: "#331917",
  blue: "#5B8DEF",
};

const FONT_UI = "'Rubik', 'Vazirmatn', sans-serif";
const FONT_TITLE = "'Lalezar', 'Rubik', sans-serif";
const FONT_MONO = "'Markazi Text', 'Rubik', serif";

const CHECKLIST_ITEMS = [
  { key: "mss", label: "MSS" },
  { key: "sweep", label: "Sweep" },
  { key: "fvg", label: "FVG" },
  { key: "discount", label: "Discount" },
  { key: "divergence", label: "Divergence" },
  { key: "trendline", label: "Trendline" },
];

const EMOTIONS = ["آرام", "عجول", "ترس", "انتقام", "FOMO", "اعتماد به نفس زیاد"];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const emptyTrade = () => ({
  id: uid(),
  date: new Date().toISOString().slice(0, 10),
  time: new Date().toTimeString().slice(0, 5),
  symbol: "",
  direction: "buy",
  style: "scalp",
  leverage: "",
  entryPrice: "",
  volume: "",
  tp1: "",
  tp2: "",
  sl: "",
  riskReward: "",
  entryReason: "",
  checklist: { mss: false, sweep: false, fvg: false, discount: false, divergence: false, trendline: false },
  entryTrigger: "",
  emotionBefore: EMOTIONS[0],
  goodSleep: "yes",
  financialStress: "no",
  onlyWantToTrade: "no",
  marketExpectation: "",
  whatHappened: "",
  equityBefore: "",
  equityAfter: "",
  predictedProfitPercent: "",
  actualPnL: "",
  result: "win",
  followedPlan: "yes",
  mistake: "",
  lesson: "",
  mainTakeaway: "",
  entryImage: "",
  exitImage: "",
});

/* ---------------------------------------------------------------
   Small UI atoms
--------------------------------------------------------------- */
function LazyImage({ src, alt, style, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: 90,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.surface2,
          color: C.faint,
          fontSize: 11,
          textAlign: "center",
          padding: 8,
        }}
      >
        تصویر بارگذاری نشد
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: C.surface2, overflow: "hidden" }}>
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, ${C.surface2} 25%, ${C.border} 37%, ${C.surface2} 63%)`,
            backgroundSize: "400% 100%",
            animation: "skeleton-pulse 1.4s ease infinite",
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        onClick={onClick}
        style={{ opacity: loaded ? 1 : 0, transition: "opacity .25s ease", ...style }}
      />
    </div>
  );
}

function Field({ label, children, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <label style={{ display: "block", fontSize: 13, color: C.text, opacity: 0.85, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: C.surface2,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "9px 12px",
  color: C.text,
  fontFamily: FONT_UI,
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};

function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function TextArea(props) {
  return <textarea {...props} style={{ ...inputStyle, resize: "vertical", minHeight: 70, ...(props.style || {}) }} />;
}
function Select({ children, ...props }) {
  return (
    <select {...props} style={inputStyle}>
      {children}
    </select>
  );
}

function SegButton({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 8,
              fontSize: 14,
              fontFamily: FONT_UI,
              border: `1px solid ${active ? C.gold : C.border}`,
              background: active ? C.goldSoft : C.surface2,
              color: active ? C.gold : C.muted,
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <Card style={{ borderTop: `2px solid ${accent || C.border}` }}>
      <div style={{ fontSize: 12, color: C.text, opacity: 0.82, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: "clamp(24px, 4vw, 28px)", color: C.text, fontWeight: 600 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>{sub}</div>}
    </Card>
  );
}

function ResultBadge({ result, fontSize = 11 }) {
  const map = {
    win: { c: C.green, bg: C.greenSoft, t: "سود" },
    loss: { c: C.red, bg: C.redSoft, t: "ضرر" },
    be: { c: C.muted, bg: C.surface2, t: "سربه‌سر" },
  };
  const s = map[result] || map.be;
  return (
    <span
      style={{
        background: s.bg,
        color: s.c,
        fontSize,
        padding: "3px 9px",
        borderRadius: 999,
        fontFamily: FONT_UI,
        whiteSpace: "nowrap",
      }}
    >
      {s.t}
    </span>
  );
}

/* ---------------------------------------------------------------
   Stats helpers
--------------------------------------------------------------- */
function computeStats(trades) {
  const n = (v) => (v === "" || v === undefined || v === null ? 0 : parseFloat(v));
  const decisive = trades.filter((t) => t.result === "win" || t.result === "loss");
  const wins = trades.filter((t) => t.result === "win");
  const losses = trades.filter((t) => t.result === "loss");
  const winRate = decisive.length ? (wins.length / decisive.length) * 100 : 0;

  const rrVals = trades.map((t) => n(t.riskReward)).filter((v) => v > 0);
  const avgRR = rrVals.length ? rrVals.reduce((a, b) => a + b, 0) / rrVals.length : 0;

  const grossProfit = wins.reduce((a, t) => a + Math.abs(n(t.actualPnL)), 0);
  const grossLoss = losses.reduce((a, t) => a + Math.abs(n(t.actualPnL)), 0);
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const now = new Date();
  const monthCount = trades.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const planAdherence = trades.length
    ? (trades.filter((t) => t.followedPlan === "yes").length / trades.length) * 100
    : 0;

  const sorted = [...trades].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const lastEquity = sorted.length ? n(sorted[sorted.length - 1].equityAfter) : 0;

  return { winRate, avgRR, profitFactor, monthCount, planAdherence, lastEquity, wins, losses, decisive };
}

function groupWinRate(trades, keyFn) {
  const groups = {};
  trades.forEach((t) => {
    if (t.result !== "win" && t.result !== "loss") return;
    const k = keyFn(t);
    if (!k) return;
    if (!groups[k]) groups[k] = { win: 0, total: 0 };
    groups[k].total += 1;
    if (t.result === "win") groups[k].win += 1;
  });
  return Object.entries(groups)
    .map(([k, v]) => ({ label: k, rate: (v.win / v.total) * 100, total: v.total }))
    .sort((a, b) => b.total - a.total);
}

function periodOfDay(time) {
  if (!time) return null;
  const h = parseInt(time.split(":")[0], 10);
  if (h >= 5 && h < 12) return "صبح";
  if (h >= 12 && h < 17) return "ظهر / عصر زود";
  if (h >= 17 && h < 21) return "عصر / شب";
  return "شب دیر / بامداد";
}

function buildInsights(trades) {
  if (trades.length < 5) return ["برای تحلیل رفتاری حداقل ۵ معامله ثبت کن تا بینش‌های دقیق‌تری ببینی."];
  const insights = [];
  const decisive = trades.filter((t) => t.result === "win" || t.result === "loss");

  const forced = decisive.filter((t) => t.followedPlan === "no");
  const planned = decisive.filter((t) => t.followedPlan === "yes");
  if (forced.length >= 3) {
    const forcedWR = (forced.filter((t) => t.result === "win").length / forced.length) * 100;
    const plannedWR = planned.length ? (planned.filter((t) => t.result === "win").length / planned.length) * 100 : 0;
    insights.push(
      `معاملات خارج از پلن (فورس) ${forcedWR.toFixed(0)}٪ وین داشتن، در مقابل ${plannedWR.toFixed(0)}٪ برای معاملات طبق پلن.`
    );
  }

  const bySetup = groupWinRate(trades, (t) =>
    CHECKLIST_ITEMS.filter((c) => t.checklist?.[c.key]).map((c) => c.label).join(" + ")
  ).filter((g) => g.label);
  if (bySetup.length) {
    const best = bySetup[0];
    insights.push(`ستاپ «${best.label || "بدون تریگر مشخص"}» با ${best.total} معامله، وین‌ریت ${best.rate.toFixed(0)}٪ داشته.`);
  }

  const byTime = groupWinRate(trades, (t) => periodOfDay(t.time));
  if (byTime.length) {
    const worst = [...byTime].sort((a, b) => a.rate - b.rate)[0];
    insights.push(`بیشترین ضرر در بازه «${worst.label}» ثبت شده — وین‌ریت این بازه ${worst.rate.toFixed(0)}٪.`);
  }

  const lowSleep = decisive.filter((t) => t.goodSleep === "no");
  if (lowSleep.length >= 3) {
    const wr = (lowSleep.filter((t) => t.result === "win").length / lowSleep.length) * 100;
    insights.push(`در روزهایی که خواب خوبی نداشتی، وین‌ریت به ${wr.toFixed(0)}٪ افت کرده.`);
  }

  const noTrigger = decisive.filter((t) => !CHECKLIST_ITEMS.some((c) => t.checklist?.[c.key]));
  if (noTrigger.length >= 3) {
    const wr = (noTrigger.filter((t) => t.result === "win").length / noTrigger.length) * 100;
    insights.push(`ورودهای بدون هیچ تریگر مشخص، فقط ${wr.toFixed(0)}٪ وین‌ریت داشتن.`);
  }

  return insights.length ? insights : ["الگوی مشخصی هنوز شناسایی نشده — به ثبت معاملات ادامه بده."];
}

/* ---------------------------------------------------------------
   Trade Form
--------------------------------------------------------------- */
function TradeForm({ initial, onSave, onCancel, userId, onNotify }) {
  const [t, setT] = useState(initial || emptyTrade());
  const [uploading, setUploading] = useState({ entryImage: false, exitImage: false });
  const [uploadError, setUploadError] = useState({ entryImage: "", exitImage: "" });
  const [previewUrl, setPreviewUrl] = useState({ entryImage: "", exitImage: "" });
  const uploadingRef = useRef({ entryImage: false, exitImage: false });
  const lastPickedRef = useRef({ entryImage: null, exitImage: null });
  const set = (k, v) => setT((p) => ({ ...p, [k]: v }));
  const setChecklist = (k) => setT((p) => ({ ...p, checklist: { ...p.checklist, [k]: !p.checklist[k] } }));

  const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

  // Revoke any local preview blobs when the form unmounts, to avoid memory leaks.
  useEffect(() => {
    return () => {
      Object.values(previewUrl).forEach((url) => url && URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Uploads the screenshot to the "trade-images" Storage bucket and stores
  // the resulting public URL on the trade (not the raw file — a raw base64
  // image is too large to keep directly in a database column).
  const makeImageHandler = (field) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting the same file later

    // Some mobile browsers (notably iOS Safari) fire "change" twice for a
    // single file pick. An in-flight guard alone isn't enough because the
    // second event can arrive *after* the first upload already finished.
    // So we also remember which exact file (name+size+timestamp) we just
    // uploaded for this field and ignore an identical repeat for a bit.
    const signature = `${file.name}-${file.size}-${file.lastModified}`;
    const last = lastPickedRef.current[field];
    if (last && last.signature === signature && Date.now() - last.time < 4000) {
      return;
    }
    if (uploadingRef.current[field]) return;

    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError((p) => ({ ...p, [field]: "حجم تصویر بیشتر از ۲ مگابایته — یه تصویر کوچیک‌تر انتخاب کن." }));
      return;
    }

    if (!supabase) {
      setUploadError((p) => ({ ...p, [field]: "اتصال Supabase برقرار نیست." }));
      return;
    }

    lastPickedRef.current[field] = { signature, time: Date.now() };
    uploadingRef.current[field] = true;
    setUploading((p) => ({ ...p, [field]: true }));
    setUploadError((p) => ({ ...p, [field]: "" }));

    // Show the picked image immediately, before the upload even finishes.
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl((p) => {
      if (p[field]) URL.revokeObjectURL(p[field]);
      return { ...p, [field]: localUrl };
    });

    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${userId}/${field}-${uid()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("trade-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from("trade-images").getPublicUrl(path);
      set(field, data.publicUrl);
    } catch (err) {
      console.error("Image upload failed:", err);
      setUploadError((p) => ({ ...p, [field]: "آپلود تصویر ناموفق بود — دوباره تلاش کن." }));
    } finally {
      uploadingRef.current[field] = false;
      setUploading((p) => ({ ...p, [field]: false }));
    }
  };

  const onEntryImageChange = makeImageHandler("entryImage");
  const onExitImageChange = makeImageHandler("exitImage");
  const clearImage = (field) => {
    setPreviewUrl((p) => {
      if (p[field]) URL.revokeObjectURL(p[field]);
      return { ...p, [field]: "" };
    });
    set(field, "");
  };

  const [submitting, setSubmitting] = useState(false);

  const requiredFields = [
    { key: "symbol", label: "نماد" },
    { key: "date", label: "تاریخ" },
    { key: "entryPrice", label: "قیمت ورود" },
    { key: "volume", label: "حجم" },
    { key: "tp1", label: "حد سود ۱" },
    { key: "tp2", label: "حد سود ۲" },
    { key: "sl", label: "حد ضرر" },
    { key: "riskReward", label: "نسبت ریسک به ریوارد" },
    { key: "entryReason", label: "علت ورود" },
  ];

  const submit = (e) => {
    e.preventDefault();
    if (submitting) return;

    const missingFields = requiredFields.filter(({ key }) => !String(t[key] ?? "").trim());
    if (missingFields.length) {
      onNotify?.("error", `لطفاً این موارد را پر کن: ${missingFields.map((item) => item.label).join("، ")}.`);
      return;
    }

    if (uploadingRef.current.entryImage || uploadingRef.current.exitImage) {
      onNotify?.("info", "تصویر در حال آپلود است. چند لحظه صبر کن و بعد دوباره تلاش کن.");
      return;
    }

    setSubmitting(true);
    onSave(t);
  };

  const section = (title, children) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 13, color: C.gold, fontWeight: 600, marginBottom: 14 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
        {children}
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {section(
        "اطلاعات پایه",
        <>
          <Field label="تاریخ">
            <TextInput type="date" value={t.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="نماد">
            <TextInput placeholder="BTCUSDT" value={t.symbol} onChange={(e) => set("symbol", e.target.value)} />
          </Field>
          <Field label="اهرم">
            <TextInput placeholder="x10" value={t.leverage} onChange={(e) => set("leverage", e.target.value)} />
          </Field>
          <Field label="جهت">
            <SegButton
              value={t.direction}
              onChange={(v) => set("direction", v)}
              options={[
                { value: "buy", label: "Buy" },
                { value: "sell", label: "Sell" },
              ]}
            />
          </Field>
          <Field label="سبک معامله">
            <SegButton
              value={t.style}
              onChange={(v) => set("style", v)}
              options={[
                { value: "scalp", label: "Scalp" },
                { value: "swing", label: "Swing" },
                { value: "daytrade", label: "Daytrade" },
              ]}
            />
          </Field>
        </>
      )}

      {section(
        "جزئیات ورود",
        <>
          <Field label="قیمت ورود">
            <TextInput type="number" step="any" value={t.entryPrice} onChange={(e) => set("entryPrice", e.target.value)} />
          </Field>
          <Field label="حجم">
            <TextInput type="number" step="any" value={t.volume} onChange={(e) => set("volume", e.target.value)} />
          </Field>
          <Field label="حد سود ۱ (TP1)">
            <TextInput type="number" step="any" value={t.tp1} onChange={(e) => set("tp1", e.target.value)} />
          </Field>
          <Field label="حد سود ۲ (TP2)">
            <TextInput type="number" step="any" value={t.tp2} onChange={(e) => set("tp2", e.target.value)} />
          </Field>
          <Field label="حد ضرر (SL)">
            <TextInput type="number" step="any" value={t.sl} onChange={(e) => set("sl", e.target.value)} />
          </Field>
          <Field label="نسبت ریسک به ریوارد (RR)">
            <TextInput type="number" step="any" placeholder="2.5" value={t.riskReward} onChange={(e) => set("riskReward", e.target.value)} />
          </Field>
        </>
      )}

      {section(
        "تریگر و ذهنیت",
        <>
          <Field label="تریگر ورود">
            <TextInput placeholder="مثلاً شکست ساختار + FVG" value={t.entryTrigger} onChange={(e) => set("entryTrigger", e.target.value)} />
          </Field>
          <Field label="احساس قبل از ورود">
            <Select value={t.emotionBefore} onChange={(e) => set("emotionBefore", e.target.value)}>
              {EMOTIONS.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: C.gold, fontWeight: 600, marginBottom: 14 }}>تصویر قبل از ورود</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, alignItems: "start" }}>
          <Field label="آپلود تصویر چارت یا ستاپ">
            <input type="file" accept="image/*" onChange={onEntryImageChange} disabled={uploading.entryImage} style={{ ...inputStyle, padding: 8, color: C.text }} />
            {uploading.entryImage && <div style={{ fontSize: 12, color: C.gold, marginTop: 6 }}>در حال آپلود...</div>}
            {uploadError.entryImage && <div style={{ fontSize: 12, color: C.red, marginTop: 6 }}>{uploadError.entryImage}</div>}
          </Field>
          {(previewUrl.entryImage || t.entryImage) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, color: C.text, opacity: 0.82 }}>پیش‌نمایش تصویر</div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: C.surface2, height: 200 }}>
                <LazyImage src={previewUrl.entryImage || t.entryImage} alt="پیش‌نمایش قبل از ورود" style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />
              </div>
              <button type="button" onClick={() => clearImage("entryImage")} style={{ alignSelf: "flex-start", background: "transparent", color: C.red, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontFamily: FONT_UI }}>
                حذف تصویر
              </button>
            </div>
          ) : (
            <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: 16, color: C.muted, fontSize: 12, lineHeight: 1.8, background: C.surface2 }}>
              می‌توانی اسکرین‌شات چارت یا ستاپ ورود را اینجا اضافه کنی.
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <Field label="علت ورود به معامله">
          <TextArea placeholder="علت ورودت را بنویس..." value={t.entryReason} onChange={(e) => set("entryReason", e.target.value)} />
        </Field>
      </div>

      {section(
        "تصویر بعد از معامله",
        <>
          <Field label="آپلود تصویر بعد از معامله">
            <input type="file" accept="image/*" onChange={onExitImageChange} disabled={uploading.exitImage} style={{ ...inputStyle, padding: 8, color: C.text }} />
            {uploading.exitImage && <div style={{ fontSize: 12, color: C.gold, marginTop: 6 }}>در حال آپلود...</div>}
            {uploadError.exitImage && <div style={{ fontSize: 12, color: C.red, marginTop: 6 }}>{uploadError.exitImage}</div>}
          </Field>
          {(previewUrl.exitImage || t.exitImage) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, color: C.text, opacity: 0.82 }}>پیش‌نمایش تصویر</div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: C.surface2, height: 200 }}>
                <LazyImage src={previewUrl.exitImage || t.exitImage} alt="پیش‌نمایش بعد از معامله" style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />
              </div>
              <button type="button" onClick={() => clearImage("exitImage")} style={{ alignSelf: "flex-start", background: "transparent", color: C.red, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontFamily: FONT_UI }}>
                حذف تصویر
              </button>
            </div>
          ) : (
            <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: 16, color: C.muted, fontSize: 12, lineHeight: 1.8, background: C.surface2 }}>
              می‌توانی تصویر بعد از معامله را اینجا آپلود کنی.
            </div>
          )}
        </>
      )}

      {section(
        "نتیجه معامله",
        <>
          <Field label="دارایی قبل از معامله">
            <TextInput type="number" step="any" value={t.equityBefore} onChange={(e) => set("equityBefore", e.target.value)} />
          </Field>
          <Field label="دارایی بعد از معامله">
            <TextInput type="number" step="any" value={t.equityAfter} onChange={(e) => set("equityAfter", e.target.value)} />
          </Field>
          <Field label="سود / زیان واقعی">
            <TextInput type="number" step="any" value={t.actualPnL} onChange={(e) => set("actualPnL", e.target.value)} />
          </Field>
          <Field label="نتیجه">
            <SegButton
              value={t.result}
              onChange={(v) => set("result", v)}
              options={[
                { value: "win", label: "سود" },
                { value: "loss", label: "ضرر" },
                { value: "be", label: "سربه‌سر" },
              ]}
            />
          </Field>
        </>
      )}

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: C.gold, fontWeight: 600, marginBottom: 14 }}>مرور و درس‌ها</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <Field label="اشتباه من">
            <TextArea value={t.mistake} onChange={(e) => set("mistake", e.target.value)} />
          </Field>
          <Field label="درس معامله">
            <TextArea value={t.lesson} onChange={(e) => set("lesson", e.target.value)} />
          </Field>
        </div>
        <div style={{ height: 16 }} />
        <Field label="معامله بر چه اساسی به تمام رسید؟">
          <TextArea value={t.mainTakeaway} onChange={(e) => set("mainTakeaway", e.target.value)} />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-start", flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            background: C.gold,
            color: "#1A1408",
            border: "none",
            borderRadius: 9,
            padding: "12px 28px",
            fontFamily: FONT_UI,
            fontWeight: 700,
            fontSize: 14,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "در حال ذخیره..." : "ذخیره معامله"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "transparent",
            color: C.muted,
            border: `1px solid ${C.border}`,
            borderRadius: 9,
            padding: "12px 24px",
            fontFamily: FONT_UI,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          انصراف
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------
   History
--------------------------------------------------------------- */
function HistoryView({ trades, onEdit, onDelete }) {
  const [zoomImage, setZoomImage] = useState("");
  const sorted = [...trades].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const yn = (v) => (v === "yes" ? "بله" : v === "no" ? "خیر" : "—");
  const checklistLabel = (t) => {
    const tags = CHECKLIST_ITEMS.filter((c) => t.checklist?.[c.key]).map((c) => c.label);
    return tags.length ? tags.join(" + ") : "—";
  };

  const DetailRow = ({ label, value }) => (
    <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 8, padding: "7px 0", borderBottom: `1px dashed ${C.borderSoft}` }}>
      <div style={{ fontSize: 12, color: C.faint }}>{label}</div>
      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.9, wordBreak: "break-word" }}>{value || "—"}</div>
    </div>
  );

  if (!sorted.length) {
    return (
      <Card>
        <div style={{ textAlign: "center", color: C.muted, padding: "30px 0" }}>هنوز معامله‌ای ثبت نشده.</div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map((t) => (
        <Card key={t.id} style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 200 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: t.direction === "buy" ? C.greenSoft : C.redSoft,
                  color: t.direction === "buy" ? C.green : C.red,
                  flexShrink: 0,
                }}
              >
                {t.direction === "buy" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              </div>
              <div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 18, color: C.text }}>{t.symbol || "—"}</div>
                <div style={{ fontSize: 14, color: C.faint }}>
                  {t.date} · {t.time} · {t.style === "scalp" ? "Scalp" : "Swing"}
                </div>
              </div>
            </div>

            <div style={{ fontFamily: FONT_MONO, fontSize: 16, color: C.muted, whiteSpace: "nowrap" }}>RR {t.riskReward || "—"}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 16, color: C.muted, whiteSpace: "nowrap" }}>
              {t.actualPnL !== "" ? `${t.actualPnL}$` : "—"}
            </div>
            <ResultBadge result={t.result} fontSize={13} />

            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => onEdit(t)}
                style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontFamily: FONT_UI, fontSize: 12 }}
              >
                ویرایش
              </button>
              <button
                onClick={() => onDelete(t.id)}
                style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.red, borderRadius: 7, padding: "6px 8px", cursor: "pointer" }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="history-details-layout" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 12, alignItems: "start" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              {[
                { src: t.entryImage, label: "قبل از ورود" },
                { src: t.exitImage, label: "بعد از معامله" },
              ].map((img, i) =>
                img.src ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setZoomImage(img.src)}
                    title="نمایش تصویر در اندازه بزرگ"
                    style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: C.surface2, padding: 0, width: "100%", height: 150, cursor: "zoom-in", position: "relative" }}
                  >
                    <LazyImage src={img.src} alt={`${t.symbol || "trade"} - ${img.label}`} style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />
                    <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(11,14,20,0.75)", color: C.text, fontSize: 10, padding: "2px 8px", borderRadius: 999, zIndex: 1 }}>{img.label}</span>
                  </button>
                ) : (
                  <div key={i} style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: 14, color: C.muted, fontSize: 12, background: C.surface2 }}>
                    تصویر «{img.label}» ثبت نشده.
                  </div>
                )
              )}
            </div>

            <div style={{ border: `1px solid ${C.borderSoft}`, borderRadius: 12, padding: "8px 12px", background: C.surface2 }}>
              <div style={{ fontSize: 12, color: C.gold, marginBottom: 6, fontWeight: 600 }}>جزئیات کامل معامله</div>
              <DetailRow label="نماد" value={t.symbol || "—"} />
              <DetailRow label="تاریخ" value={t.date || "—"} />
              <DetailRow label="ساعت" value={t.time || "—"} />
              <DetailRow label="جهت" value={t.direction === "buy" ? "Buy" : "Sell"} />
              <DetailRow label="سبک" value={t.style === "scalp" ? "Scalp" : "Swing"} />
              <DetailRow label="اهرم" value={t.leverage || "—"} />
              <DetailRow label="قیمت ورود" value={t.entryPrice} />
              <DetailRow label="حجم" value={t.volume} />
              <DetailRow label="حد سود ۱" value={t.tp1} />
              <DetailRow label="حد سود ۲" value={t.tp2} />
              <DetailRow label="حد ضرر" value={t.sl} />
              <DetailRow label="RR" value={t.riskReward} />
              <DetailRow label="تریگرها" value={checklistLabel(t)} />
              <DetailRow label="تریگر ورود" value={t.entryTrigger} />
              <DetailRow label="احساس قبل ورود" value={t.emotionBefore} />
              <DetailRow label="خواب خوب" value={yn(t.goodSleep)} />
              <DetailRow label="استرس مالی" value={yn(t.financialStress)} />
              <DetailRow label="فقط می‌خواستم ترید کنم" value={yn(t.onlyWantToTrade)} />
              <DetailRow label="طبق پلن" value={t.followedPlan === "yes" ? "بله" : "فورس بود"} />
              <DetailRow label="علت ورود" value={t.entryReason} />
              <DetailRow label="دارایی قبل" value={t.equityBefore} />
              <DetailRow label="دارایی بعد" value={t.equityAfter} />
              <DetailRow label="سود/زیان واقعی" value={t.actualPnL} />
              <DetailRow label="نتیجه" value={t.result === "win" ? "سود" : t.result === "loss" ? "ضرر" : "سربه‌سر"} />
              <DetailRow label="اشتباه" value={t.mistake} />
              <DetailRow label="درس" value={t.lesson} />
              <DetailRow label="جمع‌بندی نهایی" value={t.mainTakeaway} />
              <div style={{ fontSize: 11, color: C.faint, marginTop: 8 }}>برای ویرایش هر کدام از موارد بالا از دکمه «ویرایش» استفاده کن.</div>
            </div>
          </div>
        </Card>
      ))}

      {zoomImage && (
        <div
          onClick={() => setZoomImage("")}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5, 8, 13, 0.88)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <button
            type="button"
            onClick={() => setZoomImage("")}
            title="بستن"
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              width: 36,
              height: 36,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.surface,
              color: C.text,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>

          <img
            src={zoomImage}
            alt="نمایش بزرگ تصویر معامله"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "min(1100px, 96vw)",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: C.surface2,
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Dashboard
--------------------------------------------------------------- */
function Dashboard({ trades, onNewTrade }) {
  const s = computeStats(trades);
  const insights = useMemo(() => buildInsights(trades), [trades]);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: "clamp(22px, 5vw, 26px)", fontFamily: FONT_TITLE, fontWeight: 400, color: C.text }}>داشبورد</div>
          <div style={{ fontSize: 15, color: C.text, opacity: 0.78, marginTop: 2 }}>وضعیت کلی عملکرد معاملاتی تو</div>
        </div>
        <button
          onClick={onNewTrade}
          style={{ display: "flex", alignItems: "center", gap: 8, background: C.gold, color: "#1A1408", border: "none", borderRadius: 9, padding: "10px 18px", fontFamily: FONT_UI, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          <PlusCircle size={16} />
          ثبت معامله جدید
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        <KpiCard label="موجودی حساب" value={`${s.lastEquity.toLocaleString("fa-IR")}$`} accent={C.gold} />
        <KpiCard label="وین‌ریت" value={`${s.winRate.toFixed(0)}٪`} sub={`${s.wins.length} برد / ${s.losses.length} باخت`} accent={C.green} />
        <KpiCard label="میانگین RR" value={s.avgRR.toFixed(2)} accent={C.blue} />
        <KpiCard label="Profit Factor" value={s.profitFactor === Infinity ? "∞" : s.profitFactor.toFixed(2)} accent={C.gold} />
        <KpiCard label="معاملات این ماه" value={s.monthCount} />
        <KpiCard label="پیروی از پلن" value={`${s.planAdherence.toFixed(0)}٪`} accent={s.planAdherence >= 70 ? C.green : C.red} />
      </div>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Sparkles size={16} color={C.gold} />
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>تحلیل رفتاری</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {insights.map((line, i) => (
            <div key={i} style={{ fontSize: 14, color: C.muted, lineHeight: 2, paddingRight: 14, borderRight: `2px solid ${C.gold}` }}>
              {line}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------
   Stats page
--------------------------------------------------------------- */
function StatBar({ label, rate, total }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
        <span style={{ color: C.text }}>{label}</span>
        <span style={{ color: C.muted, fontFamily: FONT_MONO }}>
          {rate.toFixed(0)}٪ ({total})
        </span>
      </div>
      <div style={{ background: C.surface2, borderRadius: 999, height: 7, overflow: "hidden" }}>
        <div style={{ width: `${rate}%`, height: "100%", background: rate >= 50 ? C.green : C.red, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function StatsView({ trades }) {
  const bySetup = groupWinRate(trades, (t) => {
    const tags = CHECKLIST_ITEMS.filter((c) => t.checklist?.[c.key]).map((c) => c.label);
    return tags.length ? tags.join(" + ") : "بدون تریگر";
  });
  const byTime = groupWinRate(trades, (t) => periodOfDay(t.time));
  const byDirection = groupWinRate(trades, (t) => (t.direction === "buy" ? "Buy" : "Sell"));
  const byPlan = groupWinRate(trades, (t) => (t.followedPlan === "yes" ? "طبق پلن" : "فورس ترید"));

  if (!trades.length) {
    return (
      <Card>
        <div style={{ textAlign: "center", color: C.muted, padding: "30px 0" }}>برای مشاهده آمار، اول چند معامله ثبت کن.</div>
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.gold, marginBottom: 14 }}>عملکرد بر اساس ستاپ</div>
        {bySetup.map((g) => (
          <StatBar key={g.label} {...g} />
        ))}
      </Card>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.gold, marginBottom: 14 }}>عملکرد بر اساس زمان روز</div>
        {byTime.map((g) => (
          <StatBar key={g.label} {...g} />
        ))}
      </Card>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.gold, marginBottom: 14 }}>عملکرد بر اساس جهت</div>
        {byDirection.map((g) => (
          <StatBar key={g.label} {...g} />
        ))}
      </Card>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.gold, marginBottom: 14 }}>طبق پلن در برابر فورس ترید</div>
        {byPlan.map((g) => (
          <StatBar key={g.label} {...g} />
        ))}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------
   Auth gate — email/password so the same login syncs phone + laptop
--------------------------------------------------------------- */
function LoginScreen() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);

    if (!supabase) {
      setError(
        `تنظیمات Supabase ناقص است. این متغیرها را در env تنظیم کن: ${supabaseConfigStatus.missing.join(", "
        )}`
      );
      setBusy(false);
      return;
    }

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      const status = Number(err?.status || err?.statusCode || 0);
      const code = err?.code;
      const message = err?.message;

      if (status === 429 || code === "over_request_rate_limit") {
        setError("تعداد درخواست‌ها زیاد شده است. حدود 60 ثانیه صبر کن و دوباره تلاش کن.");
        return;
      }

      const map = {
        invalid_credentials: "ایمیل یا رمز عبور اشتباه است.",
        email_address_invalid: "ایمیل معتبر نیست.",
        weak_password: "رمز عبور باید حداقل ۶ کاراکتر باشد.",
        user_already_exists: "این ایمیل قبلا ثبت شده است. وارد شو.",
        "Invalid login credentials": "ایمیل یا رمز عبور اشتباه است.",
        "User already registered": "این ایمیل قبلا ثبت شده است. وارد شو.",
      };
      setError(map[code] || map[message] || "خطایی رخ داد. دوباره تلاش کن.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" style={{ fontFamily: FONT_UI, background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lalezar&family=Markazi+Text:wght@400..700&family=Rubik:ital,wght@0,300..900;1,300..900&family=Zain:ital,wght@0,200;0,300;0,400;0,700;0,800;0,900;1,300;1,400&display=swap');`}</style>
      <Card style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.goldSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={17} color={C.gold} />
          </div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: "clamp(30px, 7vw, 38px)", fontWeight: 400, color: "#FFFFFF", lineHeight: 1 }}>TradeMind</div>
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <Field label="ایمیل">
              <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Field label="رمز عبور">
              <TextInput type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="حداقل ۶ کاراکتر" />
            </Field>
          </div>
          {error && <div style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <button
            type="submit"
            disabled={busy}
            style={{ width: "100%", background: C.gold, color: "#1A1408", border: "none", borderRadius: 9, padding: "11px", fontFamily: FONT_UI, fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 12 }}
          >
            {busy ? "..." : mode === "signup" ? "ساخت حساب" : "ورود"}
          </button>
        </form>
        <div style={{ textAlign: "center", fontSize: 12, color: C.muted }}>
          {mode === "signup" ? "حساب داری؟ " : "حساب نداری؟ "}
          <span style={{ color: C.gold, cursor: "pointer" }} onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
            {mode === "signup" ? "وارد شو" : "بساز"}
          </span>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------
   Root App (signed-in journal)
--------------------------------------------------------------- */
const TABS = [
  { key: "dashboard", label: "داشبورد", icon: LayoutDashboard },
  { key: "new", label: "ثبت معامله", icon: PlusCircle },
  { key: "history", label: "تاریخچه", icon: HistoryIcon },
  { key: "stats", label: "آمار", icon: BarChart3 },
];

function Journal({ user }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [editing, setEditing] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState(null);

  const storageKey = `trademind_trades_${user?.id || "guest"}`;

  const readLocalTrades = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Failed to read local trades:", error);
      return [];
    }
  };

  const writeLocalTrades = (list) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (error) {
      console.warn("Failed to write local trades:", error);
    }
  };

  const normalizeChecklist = (value) => {
    const base = { mss: false, sweep: false, fvg: false, discount: false, divergence: false, trendline: false };
    if (!value || typeof value !== "object") return base;
    return { ...base, ...value };
  };

  const normalizeImageUrl = (value) => {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed;
  };

  const mapRowToTrade = (row) => ({
    id: row.id ? `db-${row.id}` : uid(),
    dbId: row.id ?? null,
    date: row.date || "",
    time: row.time || "",
    symbol: row.symbol || "",
    direction: row.direction || "buy",
    style: row.style || "scalp",
    leverage: row.leverage ?? "",
    entryPrice: row.entry_price ?? "",
    volume: row.volume ?? "",
    tp1: row.tp1 ?? "",
    tp2: row.tp2 ?? "",
    sl: row.sl ?? "",
    riskReward: row.risk_reward ?? "",
    entryReason: row.entry_reason ?? "",
    checklist: normalizeChecklist(row.checklist),
    entryTrigger: row.entry_trigger ?? "",
    emotionBefore: row.emotion_before ?? EMOTIONS[0],
    goodSleep: row.good_sleep ?? "yes",
    financialStress: row.financial_stress ?? "no",
    onlyWantToTrade: row.only_want_to_trade ?? "no",
    marketExpectation: row.market_expectation ?? "",
    whatHappened: row.what_happened ?? "",
    equityBefore: row.equity_before ?? "",
    equityAfter: row.equity_after ?? "",
    predictedProfitPercent: row.predicted_profit_percent ?? "",
    actualPnL: row.actual_pnl ?? "",
    result: row.result || "be",
    followedPlan: row.followed_plan ?? "yes",
    mistake: row.mistake ?? "",
    lesson: row.lesson ?? "",
    mainTakeaway: row.main_takeaway ?? "",
    entryImage: normalizeImageUrl(row.entry_image),
    exitImage: normalizeImageUrl(row.exit_image),
  });

  const mapTradeToRow = (trade) => ({
    user_id: user.id,
    date: trade.date,
    time: trade.time,
    symbol: trade.symbol,
    direction: trade.direction,
    style: trade.style,
    leverage: trade.leverage || null,
    entry_price: trade.entryPrice || null,
    volume: trade.volume || null,
    tp1: trade.tp1 || null,
    tp2: trade.tp2 || null,
    sl: trade.sl || null,
    risk_reward: trade.riskReward || null,
    entry_reason: trade.entryReason || null,
    checklist: normalizeChecklist(trade.checklist),
    entry_trigger: trade.entryTrigger || null,
    emotion_before: trade.emotionBefore || null,
    good_sleep: trade.goodSleep || null,
    financial_stress: trade.financialStress || null,
    only_want_to_trade: trade.onlyWantToTrade || null,
    market_expectation: trade.marketExpectation || null,
    what_happened: trade.whatHappened || null,
    equity_before: trade.equityBefore || null,
    equity_after: trade.equityAfter || null,
    predicted_profit_percent: trade.predictedProfitPercent || null,
    actual_pnl: trade.actualPnL || null,
    result: trade.result || "be",
    followed_plan: trade.followedPlan || null,
    mistake: trade.mistake || null,
    lesson: trade.lesson || null,
    main_takeaway: trade.mainTakeaway || null,
    entry_image: normalizeImageUrl(trade.entryImage) || null,
    exit_image: normalizeImageUrl(trade.exitImage) || null,
    created_at: new Date().toISOString(),
  });

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const loadTrades = async () => {
      if (!supabase) {
        setTrades(readLocalTrades());
        setLoading(false);
        return;
      }

      try {
        console.log("Current user:", user.id);

        const { data, error } = await supabase
          .from("trades")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        console.log("Loaded data:", data);
        console.log("Loaded error:", error);

        if (error) {
          throw error;
        }

        const mappedTrades = Array.isArray(data) ? data.map(mapRowToTrade) : [];
        setTrades(mappedTrades);
        writeLocalTrades(mappedTrades);

        console.log("Loaded trades:", mappedTrades);
      } catch (error) {
        console.error("Loading trades failed:", error);
        const localTrades = readLocalTrades();
        setTrades(localTrades);
      } finally {
        setLoading(false);
      }
    };

    loadTrades();
  }, [storageKey, user.id]);

  const persist = async (trade) => {
    setSaveState("saving");

    if (!supabase) {
      setSaveState("error");
      setSaveError("اتصال Supabase برقرار نیست — بررسی کن مقادیر VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY در تنظیمات Vercel درست ثبت شده باشن.");
      return null;
    }

    try {
      const row = mapTradeToRow(trade);

      let response;
      if (trade.dbId) {
        response = await supabase.from("trades").update(row).eq("id", trade.dbId).select();
      } else {
        response = await supabase.from("trades").insert(row).select();
      }

      const { data, error } = response;
      if (error) throw error;

      const savedRow = Array.isArray(data) ? data[0] : null;
      setSaveState("saved");
      setSaveError("");
      setTimeout(() => setSaveState("idle"), 1200);
      return savedRow;
    } catch (error) {
      console.error("Saving failed:", error);
      setSaveState("error");
      setSaveError(error?.message || "ذخیره در سرور ناموفق بود. این معامله فقط روی همین دستگاه ذخیره شد.");
      return null;
    }
  };

  const handleSave = async (trade) => {
    const exists = trades.some((t) => t.id === trade.id);
    const nextList = exists ? trades.map((t) => (t.id === trade.id ? trade : t)) : [...trades, trade];
    setTrades(nextList);
    writeLocalTrades(nextList);
    setEditing(null);
    setTab("history");

    const savedRow = await persist(trade);

    if (savedRow) {
      const savedTrade = mapRowToTrade(savedRow);
      const finalList = nextList.map((t) => (t.id === trade.id ? { ...t, ...savedTrade, dbId: savedRow.id } : t));
      setTrades(finalList);
      writeLocalTrades(finalList);
    }
  };

  const handleDelete = async (id) => {
    const targetTrade = trades.find((t) => t.id === id);

    if (targetTrade?.dbId && supabase) {
      try {
        await supabase.from("trades").delete().eq("id", targetTrade.dbId);
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }

    const nextList = trades.filter((t) => t.id !== id);
    setTrades(nextList);
    writeLocalTrades(nextList);
  };

  const startNew = () => {
    setEditing(emptyTrade());
    setTab("new");
  };
  const startEdit = (trade) => {
    setEditing(trade);
    setTab("new");
  };

  return (
    <div dir="rtl" style={{ fontFamily: FONT_UI, background: C.bg, minHeight: "100vh", color: C.text, paddingBottom: 76 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lalezar&family=Markazi+Text:wght@400..700&family=Rubik:ital,wght@0,300..900;1,300..900&family=Zain:ital,wght@0,200;0,300;0,400;0,700;0,800;0,900;1,300;1,400&display=swap');
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: ${C.faint}; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes skeleton-pulse { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
        .history-details-layout { grid-template-columns: 1fr; }
        @media (min-width: 900px) {
          .history-details-layout { grid-template-columns: minmax(0, 260px) 1fr; }
        }
        @media (min-width: 768px) { .mobile-nav { display: none; } }
        @media (max-width: 767px) { .desktop-nav { display: none; } }
      `}</style>

      <div style={{ borderBottom: `1px solid ${C.borderSoft}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: C.goldSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={16} color={C.gold} />
          </div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: "clamp(24px, 5vw, 28px)", fontWeight: 400, letterSpacing: 0.2 }}>TradeMind</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 11, color: saveState === "error" ? C.red : C.faint, display: "flex", alignItems: "center", gap: 6, maxWidth: 260, textAlign: "left" }}>
            {saveState === "saving" && (
              <>
                <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                در حال ذخیره...
              </>
            )}
            {saveState === "saved" && "ذخیره شد ✓"}
            {saveState === "error" && `ذخیره نشد — ${saveError}`}
          </div>
          <button
            onClick={() => supabase?.auth.signOut()}
            title="خروج"
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: 7, cursor: "pointer", display: "flex" }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {toast ? (
        <div
          style={{
            position: "fixed",
            top: 16,
            left: 16,
            zIndex: 2000,
            maxWidth: "min(360px, calc(100vw - 32px))",
            padding: "12px 14px",
            borderRadius: 12,
            border: `1px solid ${toast.type === "error" ? C.red : C.gold}`,
            background: toast.type === "error" ? C.redSoft : C.goldSoft,
            color: toast.type === "error" ? C.red : C.gold,
            boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <div style={{ flex: 1, fontSize: 13, lineHeight: 1.7 }}>{toast.text}</div>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: 0,
              fontSize: 14,
              lineHeight: 1,
            }}
            aria-label="بستن اعلان"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 6, padding: "14px 20px 0" }} className="desktop-nav">
        {TABS.map((tItem) => {
          const Icon = tItem.icon;
          const active = tab === tItem.key || (tab === "new" && tItem.key === "new");
          return (
            <button
              key={tItem.key}
              onClick={() => (tItem.key === "new" ? startNew() : setTab(tItem.key))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 16px",
                borderRadius: 9,
                border: `1px solid ${active ? C.gold : "transparent"}`,
                background: active ? C.goldSoft : "transparent",
                color: active ? C.gold : C.muted,
                fontFamily: FONT_UI,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <Icon size={15} />
              {tItem.label}
            </button>
          );
        })}
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "18px 20px 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: C.muted }}>در حال بارگذاری...</div>
        ) : tab === "dashboard" ? (
          <Dashboard trades={trades} onNewTrade={startNew} />
        ) : tab === "history" ? (
          <>
            <div style={{ fontSize: "clamp(24px, 5vw, 28px)", fontFamily: FONT_TITLE, fontWeight: 400, marginBottom: 14 }}>تاریخچه معاملات</div>
            <HistoryView trades={trades} onEdit={startEdit} onDelete={handleDelete} />
          </>
        ) : tab === "stats" ? (
          <>
            <div style={{ fontSize: "clamp(24px, 5vw, 28px)", fontFamily: FONT_TITLE, fontWeight: 400, marginBottom: 14 }}>آمار و تحلیل</div>
            <StatsView trades={trades} />
          </>
        ) : tab === "new" ? (
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontSize: "clamp(24px, 5vw, 28px)", fontFamily: FONT_TITLE, fontWeight: 400 }}>{editing?.symbol ? "ویرایش معامله" : "ثبت معامله جدید"}</div>
              <button onClick={() => setTab("dashboard")} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <TradeForm initial={editing} onSave={handleSave} onCancel={() => setTab("dashboard")} userId={user.id} onNotify={(type, text) => setToast({ type, text })} />
          </Card>
        ) : null}
      </div>

      <div className="mobile-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 6px" }}>
        {TABS.map((tItem) => {
          const Icon = tItem.icon;
          const active = tab === tItem.key || (tab === "new" && tItem.key === "new");
          return (
            <button
              key={tItem.key}
              onClick={() => (tItem.key === "new" ? startNew() : setTab(tItem.key))}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0", background: "transparent", border: "none", color: active ? C.gold : C.faint, cursor: "pointer" }}
            >
              <Icon size={18} />
              <span style={{ fontSize: 10, fontFamily: FONT_UI }}>{tItem.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = signed out

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (user === undefined) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: FONT_UI }}>
        در حال بارگذاری...
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  return <Journal user={user} />;
}