# TradeMind — راهنمای پابلیش رایگان

این پروژه یه اپ کامل ژورنال معاملاتیه که با **گیت‌هاب (رایگان)**، **Vercel (هاست رایگان)** و **Firebase (دیتابیس رایگان)** پابلیش میشه. بعد از این کار، یه آدرس اینترنتی مستقل (مثل `trademind-abolfazl.vercel.app`) داری که روی گوشی و لپ‌تاپ، مستقل از Claude، بازش می‌کنی و اطلاعات بین‌شون سینک میشه. هیچ هزینه‌ای هم نداره (در حد استفاده شخصی، تو پلن رایگان همه‌ی این سرویس‌ها جا میشی).

کل کار حدود ۲۰-۳۰ دقیقه زمان می‌بره و فقط کلیک کردنه، نیازی به دستور نوشتن (Terminal) نیست.

---

## مرحله ۱ — ساخت پروژه Firebase (دیتابیس رایگان)

۱. برو به [console.firebase.google.com](https://console.firebase.google.com) و با جیمیل خودت وارد شو.
۲. روی **Add project** بزن، یه اسم بده (مثلاً `trademind`) و پروژه رو بساز (Google Analytics رو می‌تونی خاموش کنی، لازم نیست).
۳. از منوی سمت راست، برو به **Build → Authentication** → **Get started**. تب **Sign-in method** رو باز کن، روی **Email/Password** بزن و **Enable** کن.
۴. از منوی سمت راست برو به **Build → Firestore Database** → **Create database**. حالت **Production mode** رو انتخاب کن و یه location نزدیک (مثلاً `eur3` یا هرچی پیش‌فرض بود) رو انتخاب کن.
۵. بعد از ساخته شدن دیتابیس، برو به تب **Rules** و محتوای داخلش رو با این جایگزین کن، بعد **Publish** بزن:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

این یعنی هر کاربر فقط به داده‌های خودش دسترسی داره.

۶. برو به آیکون چرخ‌دنده بالا سمت چپ → **Project settings**. پایین صفحه، بخش **Your apps** → روی آیکون `</>` (Web) بزن، یه اسم بده و **Register app**.
۷. یه کد `firebaseConfig` بهت نشون میده شبیه این:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "trademind-xxxx.firebaseapp.com",
  projectId: "trademind-xxxx",
  storageBucket: "trademind-xxxx.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

این مقادیر رو نگه دار، مرحله بعد لازمشون داری.

---

## مرحله ۲ — وارد کردن مقادیر Firebase توی پروژه

فایل `src/firebase.js` رو باز کن و مقادیر `PASTE_YOUR_...` رو با همون مقادیری که از Firebase گرفتی جایگزین کن.

---

## مرحله ۳ — آپلود پروژه روی GitHub (بدون نیاز به دستور)

۱. برو به [github.com](https://github.com) و یه حساب رایگان بساز (اگه نداری).
۲. روی **New repository** بزن، اسمش رو بذار `trademind`، **Public** یا **Private** فرقی نداره، بزن **Create repository**.
۳. توی صفحه‌ی خالی repo، لینک **uploading an existing file** رو بزن.
۴. تمام فایل‌ها و پوشه‌ی `src` این پروژه رو (همونایی که الان ازم گرفتی) بکش و بنداز توی اون صفحه، بعد **Commit changes** بزن.

---

## مرحله ۴ — پابلیش روی Vercel (هاست رایگان)

۱. برو به [vercel.com](https://vercel.com) و با همون حساب GitHub وارد شو (**Continue with GitHub**).
۲. روی **Add New → Project** بزن.
۳. repo ی `trademind` که ساختی رو پیدا کن و **Import** بزن.
۴. Vercel خودش تشخیص میده که پروژه Vite هست، نیازی به تغییر تنظیمات نیست. روی **Deploy** بزن.
۵. بعد از ۱-۲ دقیقه، یه آدرس مثل `trademind-yourname.vercel.app` بهت میده — همینه، آدرس نهایی اپ توئه، کاملاً رایگان.

---

## مرحله ۵ — استفاده

۱. اون آدرس رو روی گوشی و لپ‌تاپ باز کن.
۲. اولین بار، با یه ایمیل و رمز عبور دلخواه **حساب بساز** (Sign up).
۳. روی هر دستگاه دیگه‌ای با همون ایمیل و رمز **وارد شو** (Sign in) — چون داده‌ها روی Firestore ذخیره میشن، بین دستگاه‌ها سینک میشن.
۴. اگه خواستی می‌تونی صفحه رو از مرورگر گوشی به‌صورت "Add to Home Screen" به صفحه اصلی گوشی اضافه کنی تا شبیه یه اپ مستقل باز بشه.

---

## نکته درباره‌ی هزینه

پلن رایگان Firebase (Spark) و Vercel (Hobby) برای استفاده‌ی شخصی یه نفره کاملاً کافیه و هزینه‌ای نداره. اگه بعداً خواستی این رو تبدیل به محصول (SaaS) کنی که کاربرهای دیگه هم ثبت‌نام کنن، همون موقع باید محدودیت‌های پلن رایگان رو بررسی کنی.
