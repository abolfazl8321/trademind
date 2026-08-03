import React, { useState, useEffect, useMemo, useRef } from "react";
import {
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

const TRADE_RESULT_OPTIONS = [
  { value: "win", label: "Win" },
  { value: "loss", label: "Loss" },
  { value: "be", label: "Risk Free" },
];

const EMOTION_OPTIONS = [
  { key: "fear", label: "ترس" },
  { key: "calm", label: "آرام" },
  { key: "greed", label: "طمع" },
  { key: "fomo", label: "FOMO" },
  { key: "revenge_trade", label: "انتقام" },
  { key: "anger", label: "خشم" },
  { key: "distracted", label: "عدم تمرکز" },
  { key: "urge_to_trade", label: "میل به معامله" },
];

const STATUS_OPTIONS = [
  { key: "plan_followed", label: "طبق پلن" },
  { key: "revenge_trade", label: "Revenge Trade" },
  { key: "fomo", label: "FOMO" },
  { key: "risk_mismanagement", label: "خارج از مدیریت ریسک" },
  { key: "emotional_entry", label: "ورود احساسی" },
  { key: "force_trade", label: "Force Trade" },
  { key: "signal", label: "سیگنال" },
];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const normalizeDirection = (value) => {
  if (value === "short" || value === "sell") return "short";
  if (value === "buy" || value === "long") return "long";
  return "";
};

const parseEmotionSelections = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const serializeEmotionSelections = (values) => values.filter(Boolean).join(", ");

const extractNumericValue = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const normalized = value
    .trim()
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/,/g, ".");

  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return 0;
  const parsed = parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getTradeOutcome = (trade) => {
  const value = String(trade?.tradeResult || "").trim().toLowerCase();
  if (value === "win") return "win";
  if (value === "loss") return "loss";
  if (value === "be") return "be";
  return "";
};

const getTradeOutcomeLabel = (trade) => {
  const outcome = getTradeOutcome(trade);
  if (outcome === "win") return "Win";
  if (outcome === "loss") return "Loss";
  if (outcome === "be") return "Risk Free";
  return "—";
};

const normalizeTradePercentInput = (value) => {
  if (typeof value !== "string") return "";
  const normalizedDigits = value
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));

  const cleaned = normalizedDigits.replace(/[^0-9.,-]/g, "").replace(/,/g, ".");
  const hasMinus = cleaned.includes("-");
  const unsigned = cleaned.replace(/-/g, "");
  const parts = unsigned.split(".");
  const integerPart = parts.shift() || "";
  const decimalPart = parts.join("");
  const endsWithDot = cleaned.endsWith(".");
  const merged = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;

  if (endsWithDot && !decimalPart) {
    return `${hasMinus ? "-" : ""}${integerPart}.`;
  }

  return `${hasMinus ? "-" : ""}${merged}`;
};

const emptyTrade = () => ({
  id: uid(),
  date: new Date().toISOString().slice(0, 10),
  time: new Date().toTimeString().slice(0, 5),
  symbol: "",
  direction: "",
  style: "",
  leverage: "",
  volume: "",
  tradeResult: "",
  tradePercent: "",
  executionTags: [],
  emotions: [],
  statusOptions: [],
  entryReason: "",
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
    <div
      style={{
        gridColumn: span ? `span ${span}` : undefined,
        border: `1.5px solid ${C.border}`,
        borderRadius: 9,
        overflow: "hidden",
        minHeight: 70,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          background: C.green,
          color: "#ffffff",
          textAlign: "center",
          fontSize: 11,
          fontWeight: 800,
          padding: "8px 10px",
          lineHeight: 1.2,
        }}
      >
        {label}
      </div>
      <div style={{ padding: 10 }}>{children}</div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "#ffffff",
  border: "none",
  borderRadius: 0,
  padding: "9px 12px",
  color: C.text,
  textAlign: "center",
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
    <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>
      {children}
    </select>
  );
}

function SegButton({ options, value, onChange, allowEmpty = false }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => {
        const active = value === o.value;
        const accent = active
          ? o.value === "short"
            ? { bg: C.red, border: C.red, color: "#ffffff" }
            : { bg: C.green, border: C.green, color: "#ffffff" }
          : undefined;
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => {
              if (allowEmpty && active) {
                onChange("");
                return;
              }
              onChange(o.value);
            }}
            style={{
              flex: 1,
              minWidth: 100,
              padding: "8px 10px",
              borderRadius: 9,
              fontSize: 14,
              fontFamily: FONT_UI,
              border: `1.5px solid ${active ? accent?.border || C.green : C.border}`,
              background: active ? accent?.bg || C.green : "#ffffff",
              color: active ? accent?.color || C.text : C.text,
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
        background: "#ffffff",
        border: `1.5px solid ${C.border}`,
        borderRadius: 11,
        padding: 18,
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
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

/* ---------------------------------------------------------------
   Stats helpers
--------------------------------------------------------------- */
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

  const toggleEmotionTag = (value) => {
    setT((p) => {
      const current = parseEmotionSelections(p.emotions);
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      return { ...p, emotions: serializeEmotionSelections(next) };
    });
  };
  const toggleStatusOption = (value) => {
    setT((p) => {
      const current = parseEmotionSelections(p.statusOptions);
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      return { ...p, statusOptions: serializeEmotionSelections(next) };
    });
  };
  const selectedEmotions = parseEmotionSelections(t.emotions);
  const selectedStatusOptions = parseEmotionSelections(t.statusOptions);

  const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

  // Revoke any local preview blobs when the form unmounts, to avoid memory leaks.
  useEffect(() => {
    return () => {
      Object.values(previewUrl).forEach((url) => url && URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const makeImageHandler = (field) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; 


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

  const submit = (e) => {
    e.preventDefault();
    if (submitting) return;

    if (uploadingRef.current.entryImage || uploadingRef.current.exitImage) {
      onNotify?.("info", "تصویر در حال آپلود است. چند لحظه صبر کن و بعد دوباره تلاش کن.");
      return;
    }

    setSubmitting(true);
    onSave({
      ...t,
      direction: normalizeDirection(t.direction),
      executionTags: serializeEmotionSelections(parseEmotionSelections(t.executionTags)),
      tradeResult: getTradeOutcome(t),
      tradePercent: normalizeTradePercentInput(t.tradePercent),
    });
  };

  const section = (title, children) => (
    <div className="tm-section">
      <div className="tm-section-title" style={{ color: C.gold }}>{title}</div>
      <div className="tm-section-grid">{children}</div>
    </div>
  );

  return (
    <form onSubmit={submit} className="tm-form">
      {section(
        "اطلاعات پایه",
        <>
          <Field label="تاریخ">
            <TextInput type="date" value={t.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="نماد">
            <TextInput placeholder="BTCUSDT" value={t.symbol} onChange={(e) => set("symbol", e.target.value)} />
          </Field>
          <Field label="نوع / Type">
            <SegButton
              value={normalizeDirection(t.direction)}
              onChange={(v) => set("direction", v)}
              allowEmpty
              options={[
                { value: "long", label: "Long" },
                { value: "short", label: "Short" },
              ]}
            />
          </Field>
          <Field label="Trade Mode / نوع معامله">
            <SegButton
              value={t.style}
              onChange={(v) => set("style", v)}
              allowEmpty
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
          <Field label="حجم">
            <TextInput placeholder="مثلاً 0.5" type="text" inputMode="decimal" value={t.volume} onChange={(e) => set("volume", e.target.value)} />
          </Field>
          <Field label="اهرم">
            <TextInput placeholder="x10" value={t.leverage} onChange={(e) => set("leverage", e.target.value)} />
          </Field>
          
          
        </>
      )}

      <div style={{ marginBottom: 36 }}>
        <div style={{ marginBottom: "clamp(18px, 3.2vw, 32px)" }}>
          <Field label="علت ورود به معامله">
            <TextArea
              dir="rtl"
              style={{ direction: "rtl", textAlign: "right", minHeight: 92 }}
              value={t.entryReason}
              onChange={(e) => set("entryReason", e.target.value)}
              placeholder="مثلاً: ورود بر اساس تایید سیگنال، فشار بازار، یا شکست پلن"
            />
          </Field>
        </div>
        <Field label="وضعیت اجرا معامله">
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STATUS_OPTIONS.map((option) => {
                const checked = selectedStatusOptions.includes(option.key);
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => toggleStatusOption(option.key)}
                    style={{
                      border: `1px solid ${checked ? C.green : C.border}`,
                      background: checked ? C.green : C.surface2,
                      color: checked ? "#ffffff" : C.text,
                      borderRadius: 999,
                      padding: "7px 10px",
                      cursor: "pointer",
                      fontFamily: FONT_UI,
                      fontSize: 13,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {selectedStatusOptions.length ? (
                selectedStatusOptions.map((item) => (
                  <span key={item} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 999, padding: "4px 8px", color: C.text, fontSize: 11 }}>
                    {STATUS_OPTIONS.find((option) => option.key === item)?.label || item}
                  </span>
                ))
              ) : (
                <span style={{ color: C.faint, fontSize: 12 }}>هیچ موردی انتخاب نشده است.</span>
              )}
            </div>
          </div>
        </Field>
        <div style={{ fontSize: 13, color: C.green, fontWeight: 600, marginTop: 36, marginBottom: 18 }}>تصویر قبل از معامله</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, alignItems: "start" }}>
          <Field label="آپلود تصویر قبل از معامله">
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

      {section(
        "تصویر بعد از معامله",
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
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
        </div>
        </>
      )}

      {section(
        "نتیجه معامله",
        <>
          {/* حالت اجرا (moved to image upload area) */}
          <Field label="نتیجه معامله">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TRADE_RESULT_OPTIONS.map((option) => {
                const checked = t.tradeResult === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => set("tradeResult", checked ? "" : option.value)}
                    style={{
                      border: `1px solid ${checked ? C.green : C.border}`,
                      background: checked ? C.green : C.surface2,
                      color: checked ? "#ffffff" : C.text,
                      borderRadius: 999,
                      padding: "9px 12px",
                      cursor: "pointer",
                      fontFamily: FONT_UI,
                      fontSize: 13,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="سود / ضرر (%)">
            <TextInput
              type="text"
              inputMode="decimal"
              placeholder="مثلا +2.4 یا -1.2"
              value={t.tradePercent}
              onChange={(e) => set("tradePercent", normalizeTradePercentInput(e.target.value))}
            />
          </Field>
          <Field label="احساس">
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {EMOTION_OPTIONS.map((option) => {
                  const checked = selectedEmotions.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => toggleEmotionTag(option.key)}
                      style={{
                        border: `1px solid ${checked ? C.green : C.border}`,
                        background: checked ? C.green : C.surface2,
                        color: checked ? "#ffffff" : C.text,
                        borderRadius: 999,
                        padding: "7px 10px",
                        cursor: "pointer",
                        fontFamily: FONT_UI,
                        fontSize: 13,
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedEmotions.length ? (
                  selectedEmotions.map((item) => (
                    <span key={item} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 999, padding: "4px 8px", color: C.text, fontSize: 11 }}>
                      {EMOTION_OPTIONS.find((option) => option.key === item)?.label || item}
                    </span>
                  ))
                ) : (
                  <span style={{ color: C.faint, fontSize: 12 }}>هیچ احساسی انتخاب نشده است.</span>
                )}
              </div>
            </div>
          </Field>
          
        </>
      )}

      <div style={{ marginBottom: 36, display: "grid", gap: 20 }}>
        <Field label="اشتباه اصلی">
          <TextArea dir="rtl" style={{ direction: "rtl", textAlign: "right" }} value={t.mistake} onChange={(e) => set("mistake", e.target.value)} />
        </Field>
        <Field label="بعد از معامله چه چیزی یاد گرفتی">
          <TextArea dir="rtl" style={{ direction: "rtl", textAlign: "right" }} value={t.mainTakeaway} onChange={(e) => set("mainTakeaway", e.target.value)} />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-start", flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            background: C.gold,
            color: "#ffffff",
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
          {submitting ? "در حال ذخیره..." : "ثبت ژورنال"}
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
function HistoryView({ trades, onEdit }) {
  const [zoomImage, setZoomImage] = useState("");
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [historyRange, setHistoryRange] = useState("today");
  const [historyPage, setHistoryPage] = useState(1);
  const pageSize = 50;

  const rangeOptions = [
    { key: "today", label: "امروز" },
    { key: "week", label: "این هفته" },
    { key: "month", label: "این ماه" },
  ];

  const parseNumber = (value) => {
    return extractNumericValue(value);
  };

  const filteredTrades = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return [...trades].filter((trade) => {
      const tradeDate = new Date(trade.date);
      if (Number.isNaN(tradeDate.getTime())) return false;

      switch (historyRange) {
        case "today":
          return tradeDate >= today;
        case "week":
          return tradeDate >= startOfWeek;
        case "month":
          return tradeDate >= startOfMonth;
        default:
          return true;
      }
    });
  }, [trades, historyRange]);

  const sorted = useMemo(
    () => [...filteredTrades].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [filteredTrades]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pagedTrades = useMemo(() => {
    const start = (historyPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, historyPage]);

  useEffect(() => {
    if (!sorted.length) {
      setSelectedTradeId(null);
      setHistoryPage(1);
      return;
    }

    if (selectedTradeId && !sorted.some((trade) => trade.id === selectedTradeId)) {
      setSelectedTradeId(null);
    }
    if (historyPage > totalPages) {
      setHistoryPage(totalPages);
    }
  }, [sorted, selectedTradeId, historyPage, totalPages]);

  const stats = useMemo(() => {
    const count = sorted.length;
    const totalPnL = sorted.reduce((sum, trade) => sum + parseNumber(trade.tradePercent), 0);
    const decisive = sorted.filter((trade) => {
      const outcome = getTradeOutcome(trade);
      return outcome === "win" || outcome === "loss";
    });
    const winCount = decisive.filter((trade) => getTradeOutcome(trade) === "win").length;
    const winRate = decisive.length ? (winCount / decisive.length) * 100 : 0;
    return { count, totalPnL, winRate };
  }, [sorted]);

  const selectedTrade = sorted.find((t) => t.id === selectedTradeId) || null;

  const DetailRow = ({ label, value }) => (
    <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 8, padding: "7px 0", borderBottom: `1px dashed ${C.borderSoft}` }}>
      <div style={{ fontSize: 12, color: C.faint }}>{label}</div>
      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.9, wordBreak: "break-word" }}>{value || "—"}</div>
    </div>
  );

  const pageStart = sorted.length ? (historyPage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(historyPage * pageSize, sorted.length);

  const PaginationNav = () => (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ fontSize: 12, color: C.muted }}>
        نمایش {sorted.length ? `${pageStart} تا ${pageEnd}` : "0"} از {sorted.length} ژورنال
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <button
          type="button"
          disabled={historyPage <= 1}
          onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
          style={{
            border: `1px solid ${C.border}`,
            background: historyPage <= 1 ? C.surface2 : C.surface,
            color: historyPage <= 1 ? C.faint : C.text,
            borderRadius: 9,
            padding: "8px 12px",
            cursor: historyPage <= 1 ? "default" : "pointer",
            fontFamily: FONT_UI,
            fontSize: 12,
          }}
        >
          قبلی
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => {
          const active = page === historyPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => setHistoryPage(page)}
              style={{
                minWidth: 36,
                border: `1px solid ${active ? C.green : C.border}`,
                background: active ? C.green : C.surface,
                color: active ? "#ffffff" : C.text,
                borderRadius: 9,
                padding: "8px 10px",
                cursor: "pointer",
                fontFamily: FONT_UI,
                fontSize: 12,
              }}
            >
              {page}
            </button>
          );
        })}
        <button
          type="button"
          disabled={historyPage >= totalPages}
          onClick={() => setHistoryPage((page) => Math.min(totalPages, page + 1))}
          style={{
            border: `1px solid ${C.border}`,
            background: historyPage >= totalPages ? C.surface2 : C.surface,
            color: historyPage >= totalPages ? C.faint : C.text,
            borderRadius: 9,
            padding: "8px 12px",
            cursor: historyPage >= totalPages ? "default" : "pointer",
            fontFamily: FONT_UI,
            fontSize: 12,
          }}
        >
          بعدی
        </button>
      </div>
    </div>
  );

  const labels = {
    today: "امروز",
    week: "این هفته",
    month: "این ماه",
  };
  const closeModal = () => setSelectedTradeId(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {rangeOptions.map((option) => {
          const active = historyRange === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setHistoryRange(active ? "" : option.key)}
              style={{
                border: `1.5px solid ${active ? C.green : C.border}`,
                background: active ? C.green : C.surface2,
                color: active ? "#ffffff" : C.text,
                borderRadius: 999,
                padding: "10px 16px",
                cursor: "pointer",
                fontFamily: FONT_UI,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: C.faint, marginBottom: 8 }}>تعداد معاملات</div>
          <div style={{ fontSize: 28, fontFamily: FONT_MONO, color: C.text, fontWeight: 700 }}>{stats.count}</div>
        </Card>
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: C.faint, marginBottom: 8 }}>سود / ضرر</div>
          <div style={{ fontSize: 28, fontFamily: FONT_MONO, color: stats.totalPnL >= 0 ? C.green : C.red, fontWeight: 700 }}>
            {stats.totalPnL >= 0 ? "+" : ""}{stats.totalPnL.toFixed(2)}
          </div>
        </Card>
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: C.faint, marginBottom: 8 }}>WIN RATE</div>
          <div style={{ fontSize: 28, fontFamily: FONT_MONO, color: C.text, fontWeight: 700 }}>{stats.winRate.toFixed(0)}٪</div>
        </Card>
      </div>

      <PaginationNav />

      <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface2 }}>
        <table dir="ltr" style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr style={{ background: C.green, color: "#ffffff", textAlign: "left" }}>
              <th style={{ padding: "12px 14px", fontSize: 12, textAlign: "left" }}>Date</th>
              <th style={{ padding: "12px 14px", fontSize: 12, textAlign: "left" }}>Symbol</th>
              <th style={{ padding: "12px 14px", fontSize: 12, textAlign: "left" }}>Type</th>
              <th style={{ padding: "12px 14px", fontSize: 12, textAlign: "left" }}>Trade Mode</th>
              <th style={{ padding: "12px 14px", fontSize: 12, textAlign: "left" }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {pagedTrades.length ? (
              pagedTrades.map((trade) => {
              const active = trade.id === selectedTradeId;
              return (
                <tr
                  key={trade.id}
                  onClick={() => setSelectedTradeId(trade.id)}
                  style={{
                    cursor: "pointer",
                    background: active ? C.goldSoft : "transparent",
                    color: C.text,
                    borderBottom: `1px solid ${C.borderSoft}`,
                  }}
                >
                  <td style={{ padding: "12px 14px", fontSize: 13, textAlign: "left", direction: "ltr" }}>{trade.date || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, textAlign: "left", direction: "ltr" }}>{trade.symbol || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, textAlign: "left", direction: "ltr" }}>{normalizeDirection(trade.direction) === "long" ? "Long" : trade.direction === "short" ? "Short" : "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, textAlign: "left", direction: "ltr" }}>{trade.style === "scalp" ? "Scalp" : trade.style === "swing" ? "Swing" : trade.style === "daytrade" ? "Daytrade" : "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, textAlign: "left", direction: "ltr" }}>{getTradeOutcomeLabel(trade)}</td>
                </tr>
              );
              })
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: "24px 14px", textAlign: "center", color: C.muted, fontSize: 13, direction: "rtl" }}>
                  معامله‌ای برای بازه «{labels[historyRange] || "انتخاب شده"}» ثبت نشده.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTrade && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(5, 8, 13, 0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(920px, 100%)",
              maxHeight: "92vh",
              overflowY: "auto",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{selectedTrade.symbol || "معامله"}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {selectedTrade.date || "—"} · {selectedTrade.time || "—"}
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: C.surface2,
                  color: C.text,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                {[
                  { src: selectedTrade.entryImage, label: "قبل از ورود" },
                  { src: selectedTrade.exitImage, label: "بعد از معامله" },
                ].map((img, i) =>
                  img.src ? (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setZoomImage(img.src)}
                      title="نمایش تصویر در اندازه بزرگ"
                      style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: C.surface2, padding: 0, width: "100%", height: 150, cursor: "zoom-in", position: "relative" }}
                    >
                      <LazyImage src={img.src} alt={`${selectedTrade.symbol || "trade"} - ${img.label}`} style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />
                            <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.65)", color: "#ffffff", fontSize: 10, padding: "2px 8px", borderRadius: 999, zIndex: 1 }}>{img.label}</span>
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
                <DetailRow label="تاریخ" value={selectedTrade.date || "—"} />
                <DetailRow label="ساعت" value={selectedTrade.time || "—"} />
                <DetailRow label="جهت" value={normalizeDirection(selectedTrade.direction) === "long" ? "Long" : selectedTrade.direction === "short" ? "Short" : "—"} />
                <DetailRow label="نوع" value={selectedTrade.style === "scalp" ? "Scalp" : selectedTrade.style === "swing" ? "Swing" : selectedTrade.style === "daytrade" ? "Daytrade" : "—"} />
                <DetailRow label="اهرم" value={selectedTrade.leverage || "—"} />
                <DetailRow label="حجم" value={selectedTrade.volume || "—"} />
                <DetailRow label="سود / ضرر (%)" value={selectedTrade.tradePercent || "—"} />
                {/* Old execution-tags detail removed (replaced by statusOptions) */}
                <DetailRow
                  label="احساس"
                  value={parseEmotionSelections(selectedTrade.emotions)
                    .map((item) => EMOTION_OPTIONS.find((opt) => opt.key === item)?.label || item)
                    .join(" · ") || "—"}
                />
                <DetailRow
                  label="وضعیت"
                  value={parseEmotionSelections(selectedTrade.statusOptions)
                    .map((item) => STATUS_OPTIONS.find((opt) => opt.key === item)?.label || item)
                    .join(" · ") || "—"}
                />
                <DetailRow label="علت ورود به معامله" value={selectedTrade.entryReason || "—"} />
                <DetailRow label="نتیجه" value={getTradeOutcomeLabel(selectedTrade)} />
                <DetailRow label="اشتباه" value={selectedTrade.mistake} />
                {/* `درس` removed per request */}
                <DetailRow label="جمع‌بندی نهایی" value={selectedTrade.mainTakeaway} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setSelectedTradeId(pagedTrades[Math.max(0, pagedTrades.findIndex((trade) => trade.id === selectedTrade.id) + 1)]?.id || selectedTrade.id)}
                  style={{ background: C.surface2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 14px", cursor: "pointer", fontFamily: FONT_UI, fontSize: 13 }}
                >
                  معامله بعدی
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeModal();
                    onEdit(selectedTrade);
                  }}
                  style={{ background: C.green, color: "#ffffff", border: "none", borderRadius: 9, padding: "10px 14px", cursor: "pointer", fontFamily: FONT_UI, fontSize: 13 }}
                >
                  ویرایش معامله
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sorted.length > pageSize ? <PaginationNav /> : null}

      {zoomImage && (
        <div
            onClick={() => setZoomImage("")}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(5, 8, 13, 0.88)",
              zIndex: 1300,
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
  const [analysisRange, setAnalysisRange] = useState("");

  const rangeOptions = [
    { key: "day", label: "روزانه" },
    { key: "week", label: "هفتگی" },
    { key: "month", label: "ماهانه" },
  ];

  const parseNumber = (value) => {
    return extractNumericValue(value);
  };

  const filteredTrades = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return [...trades].filter((trade) => {
      const tradeDate = new Date(trade.date);
      if (Number.isNaN(tradeDate.getTime())) return false;

      switch (analysisRange) {
        case "day":
          return tradeDate >= today;
        case "week":
          return tradeDate >= startOfWeek;
        case "month":
          return tradeDate >= startOfMonth;
        default:
          return true;
      }
    });
  }, [trades, analysisRange]);

  const sortedTrades = useMemo(
    () => [...filteredTrades].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [filteredTrades]
  );

  const stats = useMemo(() => {
    const totalTrades = sortedTrades.length;
    const decisiveTrades = sortedTrades.filter((trade) => {
      const outcome = getTradeOutcome(trade);
      return outcome === "win" || outcome === "loss";
    });
    const wins = decisiveTrades.filter((trade) => getTradeOutcome(trade) === "win").length;
    const winRate = decisiveTrades.length ? (wins / decisiveTrades.length) * 100 : 0;

    const accountStart = 100;
    const accountEnd = sortedTrades.reduce((balance, trade) => {
      const pct = parseNumber(trade.tradePercent);
      return balance * (1 + pct / 100);
    }, accountStart);
    const equityDelta = accountEnd - accountStart;
    const equityDeltaPercent = accountStart ? (equityDelta / accountStart) * 100 : 0;

    return { totalTrades, winRate, equityDelta, equityDeltaPercent, accountStart, accountEnd };
  }, [sortedTrades]);

  const statusCards = STATUS_OPTIONS.map((option) => {
    const count = sortedTrades.filter((trade) => parseEmotionSelections(trade.statusOptions).includes(option.key)).length;
    return { ...option, count };
  });

  const recurringMistakes = useMemo(() => {
    const normalizeText = (value) => {
      if (typeof value !== "string") return "";
      return value.trim().replace(/\s+/g, " ");
    };

    const pool = sortedTrades.flatMap((trade) => [
      { source: "اشتباه اصلی", text: normalizeText(trade.mistake) },
      { source: "چیزی که یاد گرفتی", text: normalizeText(trade.mainTakeaway) },
    ]);

    const counts = {};
    pool.forEach((item) => {
      if (!item.text || item.text.length < 4) return;
      if (!counts[item.text]) counts[item.text] = { count: 0, sources: new Set() };
      counts[item.text].count += 1;
      counts[item.text].sources.add(item.source);
    });

    return Object.entries(counts)
      .filter(([, value]) => value.count > 1)
      .map(([text, value]) => ({ text, count: value.count, sources: [...value.sources] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [sortedTrades]);

  const finalAnalysisText = sortedTrades.length
    ? "این بخش بر اساس داده‌های ژورنال در بازه انتخابی، الگوهای رفتاری و اشتباهات تکرارشونده را نشان می‌دهد."
    : "برای مشاهده تحلیل نهایی، اول چند ژورنال ثبت کن.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {rangeOptions.map((option) => {
          const active = analysisRange === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setAnalysisRange(active ? "" : option.key)}
              style={{
                border: `1.5px solid ${active ? C.green : C.border}`,
                background: active ? C.green : C.surface2,
                color: active ? "#ffffff" : C.text,
                borderRadius: 999,
                padding: "10px 16px",
                cursor: "pointer",
                fontFamily: FONT_UI,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: C.faint, marginBottom: 8 }}>رشد / افت اکانت</div>
          <div style={{ fontSize: 28, fontFamily: FONT_MONO, color: stats.equityDelta >= 0 ? C.green : C.red, fontWeight: 700 }}>
            {stats.equityDelta >= 0 ? "+" : ""}{stats.equityDelta.toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>{stats.equityDeltaPercent.toFixed(1)}٪ نسبت به شروع بازه</div>
        </Card>
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: C.faint, marginBottom: 8 }}>کل معاملات</div>
          <div style={{ fontSize: 28, fontFamily: FONT_MONO, color: C.text, fontWeight: 700 }}>{stats.totalTrades}</div>
        </Card>
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: C.faint, marginBottom: 8 }}>WIN RATE</div>
          <div style={{ fontSize: 28, fontFamily: FONT_MONO, color: C.text, fontWeight: 700 }}>{stats.winRate.toFixed(0)}٪</div>
        </Card>
      </div>

      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.gold, marginBottom: 14 }}>وضعیت اجرای معامله</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          {statusCards.map((item) => (
            <div
              key={item.key}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                background: C.surface2,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: 24, fontFamily: FONT_MONO, color: C.text, fontWeight: 700 }}>{item.count}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Emotions removed from analysis view per request */}

      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.gold, marginBottom: 10 }}>تحلیل نهایی از آمار</div>
        <div style={{ color: C.muted, fontSize: 13, lineHeight: 2, marginBottom: 12 }}>{finalAnalysisText}</div>

        <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: 12, background: C.surface2, marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: C.text, fontWeight: 700, marginBottom: 8 }}>اشتباهات تکرارشونده من</div>
          {recurringMistakes.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {recurringMistakes.map((item, index) => (
                <div key={`${item.text}-${index}`} style={{ border: `1px solid ${C.borderSoft}`, borderRadius: 10, padding: "8px 10px", background: C.surface }}>
                  <div style={{ color: C.text, fontSize: 12, lineHeight: 1.8, wordBreak: "break-word" }}>{item.text}</div>
                  <div style={{ color: C.faint, fontSize: 11, marginTop: 4 }}>
                    تکرار: {item.count} بار • منبع: {item.sources.join(" + ")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: C.faint, fontSize: 12 }}>فعلا مورد تکرارشونده‌ای ثبت نشده است.</div>
          )}
        </div>
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lalezar&family=Rubik:ital,wght@0,300..900;1,300..900&family=Zain:ital,wght@0,200;0,300;0,400;0,700;0,800;0,900;1,300;1,400&display=swap');`}</style>
      <Card style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.goldSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={17} color={C.gold} />
          </div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: "clamp(30px, 7vw, 38px)", fontWeight: 400, color: C.green, lineHeight: 1 }}>TradeMind</div>
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
  { key: "new", label: "ثبت ژورنال جدید", icon: PlusCircle },
  { key: "history", label: "تاریخچه", icon: HistoryIcon },
  { key: "stats", label: "آنالیز", icon: BarChart3 },
];

function Journal({ user }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("new");
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

  const normalizeImageUrl = (value) => {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed;
  };

  const normalizeTextValue = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value.trim() ? value : null;
    return String(value);
  };

  const mapRowToTrade = (row) => ({
    id: row.id ? `db-${row.id}` : uid(),
    dbId: row.id ?? null,
    date: normalizeTextValue(row.date) ?? "",
    time: normalizeTextValue(row.time) ?? "",
    symbol: normalizeTextValue(row.symbol) ?? "",
    direction: normalizeDirection(row.direction || ""),
    style: normalizeTextValue(row.style) ?? "",
    leverage: normalizeTextValue(row.leverage) ?? "",
    volume: normalizeTextValue(row.volume) ?? "",
    executionTags: parseEmotionSelections(normalizeTextValue(row.execution_tags) ?? ""),
    emotions: parseEmotionSelections(normalizeTextValue(row.emotions) ?? ""),
    statusOptions: parseEmotionSelections(normalizeTextValue(row.status_options) ?? ""),
    entryReason: normalizeTextValue(row.entry_reason) ?? "",
    tradeResult: (() => {
      const value = normalizeTextValue(row.trade_result);
      if (!value) return "";
      const normalized = value.trim().toLowerCase();
      return normalized === "win" || normalized === "loss" || normalized === "be" ? normalized : "";
    })(),
    tradePercent: normalizeTextValue(row.trade_percent) ?? "",
    mistake: normalizeTextValue(row.mistake) ?? "",
    lesson: normalizeTextValue(row.lesson) ?? "",
    mainTakeaway: normalizeTextValue(row.main_takeaway) ?? "",
    entryImage: normalizeImageUrl(row.entry_image),
    exitImage: normalizeImageUrl(row.exit_image),
  });

  const mapTradeToRow = (trade) => ({
    user_id: user.id,
    date: normalizeTextValue(trade.date),
    time: normalizeTextValue(trade.time),
    symbol: normalizeTextValue(trade.symbol),
    direction: normalizeDirection(trade.direction),
    style: normalizeTextValue(trade.style),
    leverage: normalizeTextValue(trade.leverage),
    volume: normalizeTextValue(trade.volume),
    trade_result: normalizeTextValue(trade.tradeResult),
    trade_percent: normalizeTextValue(trade.tradePercent),
    execution_tags: normalizeTextValue(serializeEmotionSelections(parseEmotionSelections(trade.executionTags))) || null,
    emotions: normalizeTextValue(serializeEmotionSelections(parseEmotionSelections(trade.emotions))) || null,
    status_options: normalizeTextValue(serializeEmotionSelections(parseEmotionSelections(trade.statusOptions))) || null,
    entry_reason: normalizeTextValue(trade.entryReason),
    mistake: normalizeTextValue(trade.mistake),
    lesson: normalizeTextValue(trade.lesson),
    main_takeaway: normalizeTextValue(trade.mainTakeaway),
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
        @import url('https://fonts.googleapis.com/css2?family=Lalezar&family=Rubik:ital,wght@0,300..900;1,300..900&family=Zain:ital,wght@0,200;0,300;0,400;0,700;0,800;0,900;1,300;1,400&display=swap');
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: ${C.faint}; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes skeleton-pulse { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
        .history-details-layout { grid-template-columns: 1fr; }
        @media (min-width: 900px) {
          .history-details-layout { grid-template-columns: minmax(0, 280px) 1fr; }
        }
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "16px 20px 0", alignItems: "center" }}>
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
                border: `1.5px solid ${C.border}`,
                background: active ? C.green : "#ffffff",
                color: active ? "#ffffff" : C.text,
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

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 24px 48px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: C.muted }}>در حال بارگذاری...</div>
        ) : tab === "history" ? (
          <>
            <div style={{ fontSize: "clamp(24px, 5vw, 28px)", fontFamily: FONT_TITLE, fontWeight: 400, marginBottom: 14 }}>تاریخچه معاملات</div>
            <HistoryView trades={trades} onEdit={startEdit} />
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
              <button onClick={() => setTab("history")} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>
          <TradeForm initial={editing} onSave={handleSave} onCancel={() => setTab("history")} userId={user.id} onNotify={(type, text) => setToast({ type, text })} />
        </Card>
        ) : null}
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