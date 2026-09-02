import React, { useState } from "react";
import {
  TrendingUp,
  BookOpen,
  Brain,
  LogOut,
  Activity,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { supabase } from "./supabase.js";

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
  blue: "#5b8def",
};
const FONT_UI = "'Rubik', 'Vazirmatn', sans-serif";
const FONT_TITLE = "'Lalezar', 'Rubik', sans-serif";

/* ---------------------------------------------------------------
   Dashboard Card
--------------------------------------------------------------- */
function DashboardCard({ icon: Icon, title, description, features, accent, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="dashboard-card"
      style={{
        background: "#ffffff",
        border: `2px solid ${hovered ? accent : C.border}`,
        borderRadius: 22,
        padding: "clamp(28px, 4vw, 40px) clamp(20px, 3vw, 32px)",
        cursor: "pointer",
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hovered ? "translateY(-8px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 24px 56px ${accent}18, 0 8px 24px rgba(0,0,0,0.06)`
          : "0 4px 16px rgba(0,0,0,0.03)",
        textAlign: "center",
        fontFamily: FONT_UI,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        width: "100%",
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 22,
          background: `${accent}10`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.35s ease",
          transform: hovered ? "scale(1.12) rotate(-3deg)" : "scale(1)",
        }}
      >
        <Icon size={36} color={accent} strokeWidth={1.8} />
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: FONT_TITLE,
          fontSize: "clamp(22px, 4vw, 28px)",
          color: C.text,
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>

      {/* Description */}
      <div
        style={{
          color: C.muted,
          fontSize: "clamp(13px, 1.8vw, 15px)",
          lineHeight: 1.9,
          maxWidth: 320,
        }}
      >
        {description}
      </div>

      {/* Feature tags */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
        }}
      >
        {features.map((f, i) => (
          <span
            key={i}
            style={{
              background: `${accent}0D`,
              color: accent,
              padding: "5px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: `1px solid ${accent}22`,
            }}
          >
            {f}
          </span>
        ))}
      </div>

      {/* CTA button */}
      <div
        style={{
          marginTop: "auto",
          background: hovered ? accent : `${accent}DD`,
          color: "#ffffff",
          padding: "13px 32px",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          transition: "all 0.25s ease",
          transform: hovered ? "scale(1.04)" : "scale(1)",
        }}
      >
        ورود ←
      </div>
    </button>
  );
}

/* ---------------------------------------------------------------
   Dashboard — main page after login
--------------------------------------------------------------- */
export default function Dashboard({ onNavigate, user }) {
  return (
    <div
      dir="rtl"
      style={{
        fontFamily: FONT_UI,
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lalezar&family=Rubik:ital,wght@0,300..900;1,300..900&display=swap');
        @keyframes dash-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
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
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: C.goldSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TrendingUp size={16} color={C.gold} />
          </div>
          <div
            style={{
              fontFamily: FONT_TITLE,
              fontSize: "clamp(24px, 5vw, 28px)",
              fontWeight: 400,
              letterSpacing: 0.2,
            }}
          >
            TradeMind
          </div>
        </div>
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

      {/* Welcome section */}
      <div
        style={{
          textAlign: "center",
          padding: "clamp(36px, 7vw, 72px) 20px clamp(28px, 4vw, 44px)",
          animation: "dash-fade-up 0.6s ease both",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: C.goldSoft,
            padding: "8px 20px",
            borderRadius: 999,
            marginBottom: 22,
            fontSize: 13,
            color: C.green,
            fontWeight: 600,
          }}
        >
          <Activity size={14} />
          داشبورد معامله‌گر
        </div>
        <h1
          style={{
            fontFamily: FONT_TITLE,
            fontSize: "clamp(30px, 7vw, 46px)",
            fontWeight: 400,
            color: C.text,
            margin: "0 0 14px",
            lineHeight: 1.3,
          }}
        >
          خوش آمدید 👋
        </h1>
        <p
          style={{
            color: C.muted,
            fontSize: "clamp(14px, 2.2vw, 17px)",
            maxWidth: 500,
            margin: "0 auto",
            lineHeight: 1.9,
          }}
        >
          چه کاری می‌خوای انجام بدی؟ یکی از بخش‌های زیر رو انتخاب کن.
        </p>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
          gap: "clamp(18px, 3vw, 30px)",
          maxWidth: 800,
          margin: "0 auto",
          padding: "0 20px 80px",
        }}
      >
        <div style={{ animation: "dash-fade-up 0.6s ease 0.15s both", display: "flex" }}>
          <DashboardCard
            icon={BookOpen}
            title="ثبت ژورنال معاملاتی"
            description="معاملاتت رو ثبت کن، عملکردت رو تحلیل کن و اشتباهات تکراری رو شناسایی کن."
            features={["ثبت معامله", "تاریخچه", "آمار و تحلیل"]}
            accent="#174b32"
            onClick={() => onNavigate("journal")}
          />
        </div>
        <div style={{ animation: "dash-fade-up 0.6s ease 0.3s both", display: "flex" }}>
          <DashboardCard
            icon={Brain}
            title="تحلیل و سیگنال AI"
            description="هوش مصنوعی بازار رو تحلیل می‌کنه و بهترین سیگنال‌های معاملاتی رو بهت میده."
            features={["سیگنال خودکار", "تحلیل سفارشی", "Gemini AI"]}
            accent="#5b8def"
            onClick={() => onNavigate("ai")}
          />
        </div>
      </div>
    </div>
  );
}
