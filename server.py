"""
TradeMind — Python FastAPI Proxy Server (Self-Hosted Production Only)
======================================================================
⚠️  در Development نیازی به این سرور نیست!
    Vite خودش مستقیم به CoinEx proxy می‌کنه → فقط npm run dev کافیه.

⚠️  اگر روی Vercel deploy می‌کنی نیازی به این سرور نیست!
    Vercel Functions در پوشه api/ این کار رو انجام می‌دهند.

✅  فقط برای self-hosted production (VPS/سرور شخصی) استفاده کن:

نصب:
    pip install fastapi uvicorn httpx

اجرا (بعد از npm run build):
    python server.py --prod
"""

import argparse
import os
from pathlib import Path

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# ──────────────────────────────────────────────────────
# تنظیمات
# ──────────────────────────────────────────────────────

COINEX_BASE   = "https://api.coinex.com/v2"
DIST_DIR      = Path(__file__).parent / "dist"

# User-Agent استاندارد برای جلوگیری از بلاک شدن
HEADERS = {
    "User-Agent": "TradeMind/1.0",
    "Accept":     "application/json",
}

# ──────────────────────────────────────────────────────
# ساخت app
# ──────────────────────────────────────────────────────

app = FastAPI(title="TradeMind API Proxy", docs_url=None, redoc_url=None)

# در dev mode فقط localhost نیاز داریم؛ در prod همه origin ها بسته‌اند
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173", "http://localhost:8000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────
# ۱) Endpoint: کندل‌استیک
# ──────────────────────────────────────────────────────

@app.get("/api/kline")
async def get_kline(
    market: str  = Query(..., description="نماد مارکت (مثل BTCUSDT)"),
    period: str  = Query(..., description="بازه زمانی (مثل 1hour)"),
    limit:  int  = Query(70,  description="تعداد کندل (حداکثر ۱۰۰۰)"),
):
    """
    پروکسی کندل‌استیک CoinEx → مرورگر
    مثال: GET /api/kline?market=BTCUSDT&period=1hour&limit=70
    """
    params = {
        "market": market.upper(),
        "period": period,
        "limit":  min(limit, 1000),
    }
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(f"{COINEX_BASE}/spot/kline", params=params, headers=HEADERS)
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=exc.response.status_code, detail=str(exc))
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=f"خطا در اتصال به CoinEx: {exc}")

    return resp.json()


# ──────────────────────────────────────────────────────
# ۲) Endpoint: تیکر (لیست همه ارزها)
# ──────────────────────────────────────────────────────

@app.get("/api/ticker")
async def get_ticker():
    """
    پروکسی تیکر CoinEx → مرورگر
    مثال: GET /api/ticker
    """
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(f"{COINEX_BASE}/spot/ticker", headers=HEADERS)
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=exc.response.status_code, detail=str(exc))
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=f"خطا در اتصال به CoinEx: {exc}")

    return resp.json()


# ──────────────────────────────────────────────────────
# ۳) Serve فایل‌های React (فقط در production)
# ──────────────────────────────────────────────────────

def mount_static(production: bool):
    if not production:
        return

    if not DIST_DIR.exists():
        print(f"⚠️  پوشه dist/ یافت نشد. ابتدا  npm run build  را اجرا کن.")
        return

    # سرو کردن فایل‌های static (JS, CSS, assets)
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    # برای هر route دیگری index.html بده (SPA)
    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        index = DIST_DIR / "index.html"
        if index.exists():
            return FileResponse(index)
        raise HTTPException(status_code=404, detail="index.html یافت نشد. npm run build را اجرا کن.")


# ──────────────────────────────────────────────────────
# اجرا
# ──────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TradeMind Proxy Server")
    parser.add_argument("--prod", action="store_true", help="اجرا در حالت production")
    parser.add_argument("--port", type=int, default=8000, help="پورت (پیش‌فرض: 8000)")
    parser.add_argument("--host", default="0.0.0.0", help="آدرس (پیش‌فرض: 0.0.0.0)")
    args = parser.parse_args()

    mount_static(production=args.prod)

    mode = "🚀 Production" if args.prod else "🛠️  Development"
    print(f"\n{mode} Server")
    print(f"📡  http://localhost:{args.port}")
    print(f"📊  CoinEx Proxy: /api/kline  |  /api/ticker\n")

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
