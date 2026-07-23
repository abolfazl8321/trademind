import React, { useState, useEffect, useMemo } from "react";
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
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

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

const FONT_UI = "'Vazirmatn', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

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
});

/* ---------------------------------------------------------------
   Small UI atoms
--------------------------------------------------------------- */
function Field({ label, children, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <label style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6 }}>{label}</label>
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
  fontSize: 14,
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
              fontSize: 13,
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
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 24, color: C.text, fontWeight: 600 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>{sub}</div>}
    </Card>
  );
}

function ResultBadge({ result }) {
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
        fontSize: 11,
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
function TradeForm({ initial, onSave, onCancel }) {
  const [t, setT] = useState(initial || emptyTrade());
  const set = (k, v) => setT((p) => ({ ...p, [k]: v }));
  const setChecklist = (k) => setT((p) => ({ ...p, checklist: { ...p.checklist, [k]: !p.checklist[k] } }));

  const submit = (e) => {
    e.preventDefault();
    if (!t.symbol.trim()) return;
    onSave(t);
  };

  const section = (title, children) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 13, color: C.gold, fontWeight: 600, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {children}
      </div>
    </div>
  );

  return (
    <form onSubmit={submit}>
      {section(
        "اطلاعات پایه",
        <>
          <Field label="تاریخ">
            <TextInput type="date" value={t.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="ساعت">
            <TextInput type="time" value={t.time} onChange={(e) => set("time", e.target.value)} />
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

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 13, color: C.gold, fontWeight: 600, marginBottom: 12 }}>چرا وارد شدم؟</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {CHECKLIST_ITEMS.map((c) => {
            const on = t.checklist[c.key];
            return (
              <button
                type="button"
                key={c.key}
                onClick={() => setChecklist(c.key)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontFamily: FONT_UI,
                  border: `1px solid ${on ? C.gold : C.border}`,
                  background: on ? C.goldSoft : C.surface2,
                  color: on ? C.gold : C.muted,
                  cursor: "pointer",
                }}
              >
                {on ? "☑" : "☐"} {c.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
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
        </div>
      </div>

      {section(
        "روانشناسی قبل از معامله",
        <>
          <Field label="امروز خوابم خوب بود؟">
            <SegButton
              value={t.goodSleep}
              onChange={(v) => set("goodSleep", v)}
              options={[{ value: "yes", label: "بله" }, { value: "no", label: "خیر" }]}
            />
          </Field>
          <Field label="امروز استرس مالی دارم؟">
            <SegButton
              value={t.financialStress}
              onChange={(v) => set("financialStress", v)}
              options={[{ value: "no", label: "خیر" }, { value: "yes", label: "بله" }]}
            />
          </Field>
          <Field label="فقط دلم می‌خواد معامله داشته باشم؟">
            <SegButton
              value={t.onlyWantToTrade}
              onChange={(v) => set("onlyWantToTrade", v)}
              options={[{ value: "no", label: "خیر" }, { value: "yes", label: "بله" }]}
            />
          </Field>
          <Field label="طبق پلن معامله وارد شدم؟">
            <SegButton
              value={t.followedPlan}
              onChange={(v) => set("followedPlan", v)}
              options={[{ value: "yes", label: "بله" }, { value: "no", label: "فورس بود" }]}
            />
          </Field>
        </>
      )}

      <div style={{ marginBottom: 22 }}>
        <Field label="علت ورود به معامله">
          <TextArea value={t.entryReason} onChange={(e) => set("entryReason", e.target.value)} />
        </Field>
        <div style={{ height: 12 }} />
        <Field label="نمودار تصور من از حرکت بازار (توضیح)">
          <TextArea value={t.marketExpectation} onChange={(e) => set("marketExpectation", e.target.value)} />
        </Field>
        <div style={{ height: 12 }} />
        <Field label="آنچه در واقعیت اتفاق افتاد">
          <TextArea value={t.whatHappened} onChange={(e) => set("whatHappened", e.target.value)} />
        </Field>
      </div>

      {section(
        "نتیجه معامله",
        <>
          <Field label="دارایی قبل از معامله">
            <TextInput type="number" step="any" value={t.equityBefore} onChange={(e) => set("equityBefore", e.target.value)} />
          </Field>
          <Field label="دارایی بعد از معامله">
            <TextInput type="number" step="any" value={t.equityAfter} onChange={(e) => set("equityAfter", e.target.value)} />
          </Field>
          <Field label="پیش‌بینی سود درصدی">
            <TextInput type="number" step="any" value={t.predictedProfitPercent} onChange={(e) => set("predictedProfitPercent", e.target.value)} />
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

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 13, color: C.gold, fontWeight: 600, marginBottom: 12 }}>مرور و درس‌ها</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <Field label="اشتباه من">
            <TextArea value={t.mistake} onChange={(e) => set("mistake", e.target.value)} />
          </Field>
          <Field label="درس معامله">
            <TextArea value={t.lesson} onChange={(e) => set("lesson", e.target.value)} />
          </Field>
        </div>
        <div style={{ height: 12 }} />
        <Field label="معامله بر چه اساسی به تمام رسید؟">
          <TextArea value={t.mainTakeaway} onChange={(e) => set("mainTakeaway", e.target.value)} />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-start" }}>
        <button
          type="submit"
          style={{
            background: C.gold,
            color: "#1A1408",
            border: "none",
            borderRadius: 9,
            padding: "11px 26px",
            fontFamily: FONT_UI,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          ذخیره معامله
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "transparent",
            color: C.muted,
            border: `1px solid ${C.border}`,
            borderRadius: 9,
            padding: "11px 22px",
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
  const sorted = [...trades].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
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
                <div style={{ fontFamily: FONT_MONO, fontSize: 14, color: C.text }}>{t.symbol || "—"}</div>
                <div style={{ fontSize: 11, color: C.faint }}>
                  {t.date} · {t.time} · {t.style === "scalp" ? "Scalp" : "Swing"}
                </div>
              </div>
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.muted, whiteSpace: "nowrap" }}>
              RR {t.riskReward || "—"}
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.muted, whiteSpace: "nowrap" }}>
              {t.actualPnL !== "" ? `${t.actualPnL}$` : "—"}
            </div>
            <ResultBadge result={t.result} />
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
        </Card>
      ))}
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
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>داشبورد</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>وضعیت کلی عملکرد معاملاتی تو</div>
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
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>تحلیل رفتاری</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {insights.map((line, i) => (
            <div key={i} style={{ fontSize: 13, color: C.muted, lineHeight: 1.9, paddingRight: 14, borderRight: `2px solid ${C.gold}` }}>
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
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
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
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      const map = {
        "auth/invalid-email": "ایمیل معتبر نیست.",
        "auth/email-already-in-use": "این ایمیل قبلاً ثبت شده — وارد شو.",
        "auth/weak-password": "رمز عبور باید حداقل ۶ کاراکتر باشد.",
        "auth/invalid-credential": "ایمیل یا رمز عبور اشتباه است.",
        "auth/user-not-found": "حسابی با این ایمیل پیدا نشد.",
        "auth/wrong-password": "رمز عبور اشتباه است.",
      };
      setError(map[err.code] || "خطایی رخ داد. دوباره تلاش کن.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" style={{ fontFamily: FONT_UI, background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');`}</style>
      <Card style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.goldSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={17} color={C.gold} />
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 17, fontWeight: 600 }}>TradeMind</div>
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

  const userDoc = doc(db, "users", user.uid);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(userDoc);
        if (snap.exists() && snap.data().trades) setTrades(snap.data().trades);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  const persist = async (list) => {
    setTrades(list);
    setSaveState("saving");
    try {
      await setDoc(userDoc, { trades: list }, { merge: true });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch (e) {
      console.error(e);
      setSaveState("idle");
    }
  };

  const handleSave = (trade) => {
    const exists = trades.some((t) => t.id === trade.id);
    const list = exists ? trades.map((t) => (t.id === trade.id ? trade : t)) : [...trades, trade];
    persist(list);
    setEditing(null);
    setTab("history");
  };

  const handleDelete = (id) => persist(trades.filter((t) => t.id !== id));

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
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: ${C.faint}; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 768px) { .mobile-nav { display: none; } }
        @media (max-width: 767px) { .desktop-nav { display: none; } }
      `}</style>

      <div style={{ borderBottom: `1px solid ${C.borderSoft}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: C.goldSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={16} color={C.gold} />
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 600, letterSpacing: 0.5 }}>TradeMind</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 11, color: C.faint, display: "flex", alignItems: "center", gap: 6 }}>
            {saveState === "saving" && (
              <>
                <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                در حال ذخیره...
              </>
            )}
            {saveState === "saved" && "ذخیره شد ✓"}
          </div>
          <button
            onClick={() => signOut(auth)}
            title="خروج"
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: 7, cursor: "pointer", display: "flex" }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

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
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>تاریخچه معاملات</div>
            <HistoryView trades={trades} onEdit={startEdit} onDelete={handleDelete} />
          </>
        ) : tab === "stats" ? (
          <>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>آمار و تحلیل</div>
            <StatsView trades={trades} />
          </>
        ) : tab === "new" ? (
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{editing?.symbol ? "ویرایش معامله" : "ثبت معامله جدید"}</div>
              <button onClick={() => setTab("dashboard")} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <TradeForm initial={editing} onSave={handleSave} onCancel={() => setTab("dashboard")} />
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
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
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
