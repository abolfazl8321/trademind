# TradeMind - Setup with Supabase

این نسخه از TradeMind به طور کامل از Supabase برای احراز هویت و ذخیره اطلاعات استفاده می کند.

## 1) ساخت پروژه Supabase

1. وارد https://supabase.com شو و یک پروژه جدید بساز.
2. بعد از ساخته شدن پروژه، از مسیر Project Settings > API دو مقدار زیر را بردار:
- `Project URL`
- `anon public key`

## 2) ساخت جدول دیتابیس

در SQL Editor این کوئری را اجرا کن:

```sql
create table if not exists public.user_trades (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trades jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_trades enable row level security;

create policy "Users can read own trades"
on public.user_trades
for select
using (auth.uid() = user_id);

create policy "Users can insert own trades"
on public.user_trades
for insert
with check (auth.uid() = user_id);

create policy "Users can update own trades"
on public.user_trades
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

## 3) فعال سازي ايميل/پسورد

از مسير Authentication > Providers، گزينه Email را فعال کن.

## 4) تنظيم متغيرهاي محيطي در پروژه

يک فايل `.env` در ريشه پروژه بساز و اين مقادير را قرار بده (پیشنهادی برای Vite):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

نکته: اگر قبلا متغيرها را با پيشوند `NEXT_PUBLIC_` گذاشته‌اي، اين نسخه از پروژه همان‌ها را هم مي‌خواند:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

## 5) اجراي پروژه

```bash
npm install
npm run dev
```

## Deploy

اگر روي Vercel يا هر سرويس ديگر deploy مي کني، همين دو متغير محيطي را در Environment Variables ست کن:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

در صورت استفاده از الگوی قبلي، مي‌تواني `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` را هم ست کني.

## نکته امنيتي

از `service_role key` در فرانت اند استفاده نکن. فقط `anon public key` مجاز است.
