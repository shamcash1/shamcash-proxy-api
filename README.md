# Sham Cash Dynamic PAC API 🇸🇾⚡

مشروع واجهة برمجية (API) مخصص لتوليد ملفات PAC (Proxy Auto-Configuration) ديناميكية لتطبيق **شام كاش (Sham Cash)** بناءً على حالة اشتراك المستخدم وتاريخ صلاحيته في قاعدة بيانات Supabase.

جاهز للنشر مباشرة على استضافة **Vercel** كـ Serverless Function.

---

## 🚀 المميزات

- **توجيه ذكي ومحدد**: يوجه فقط نطاقات سيرفرات تطبيق شام كاش (`*api.shamcash.sy*` و `*bank.shamcash.sy*`) عبر البروكسي المخصص للمستخدم، بينما تظل بقية المواقع والخدمات مباشرة `DIRECT`.
- **فحص مباشر من Supabase**: يتحقق في اللحظة من حالة المستخدم (`is_active = true`) وتاريخ انتهاء الصلاحية (`expiry_date >= اليوم`).
- **حماية وإيقاف تلقائي**: في حال عدم وجود المستخدم، أو انتهاء صلاحيته، أو تعطيل حسابه، يتم إرجاع ملف PAC يحتوي على `DIRECT` لمنع استهلاك البروكسي.
- **دعم استضافة Vercel Serverless**: مهيأ بملف `vercel.json` للعمل بدون خوادم وبسرعة استجابة فائقة.

---

## 📁 هيكلية المشروع

```text
├── api/
│   └── index.js         # كود Express و Supabase ومعالج الـ PAC
├── vercel.json          # إعدادات نشر Vercel Serverless Function
├── package.json         # الاعتماديات (express, @supabase/supabase-js)
├── schema.sql           # كود SQL لإنشاء الجدول في Supabase
└── README.md
```

---

## 🛠️ إعداد قاعدة بيانات Supabase (SQL)

قم بنسخ الكود التالي وتنفيذه في **SQL Editor** داخل لوحة تحكم مشروعك في [Supabase](https://supabase.com):

```sql
-- 1. إنشاء جدول proxy_clients
CREATE TABLE IF NOT EXISTS public.proxy_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expiry_date DATE NOT NULL,
    proxy_host TEXT NOT NULL,
    proxy_port INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. فهرس للبحث السريع بحسب اسم المستخدم
CREATE INDEX IF NOT EXISTS idx_proxy_clients_username ON public.proxy_clients (username);

-- 3. تفعيل حماية السجلات (RLS)
ALTER TABLE public.proxy_clients ENABLE ROW LEVEL SECURITY;

-- 4. إتاحة القراءة لمفتاح API لاستخراج إعدادات الـ PAC
CREATE POLICY "Allow public read on proxy_clients" 
ON public.proxy_clients 
FOR SELECT 
USING (true);
```

---

## 🔗 طريقة الاستخدام (API Endpoints)

### 1. رابط ملف الـ PAC:
```http
GET /pac/:username
```

#### مثال 1: المستخدم نشط وساري الصلاحية
إذا كان العميل مسجلاً ولديه `is_active = true` وتاريخ انتهاء في المستقبل:
```javascript
function FindProxyForURL(url, host) {
    if (shExpMatch(host, "*api.shamcash.sy*") || 
        shExpMatch(host, "*bank.shamcash.sy*")) {
        return "PROXY 185.190.140.20:8080";
    }
    return "DIRECT";
}
```

#### مثال 2: المستخدم غير موجود أو منتهي الصلاحية أو موقوف
```javascript
function FindProxyForURL(url, host) { return "DIRECT"; }
```

---

## 📱 كيفية إعداد الرابط في أجهزة المستخدمين

1. **أجهزة iPhone / iPad (iOS)**:
   - اذهب إلى **الإعدادات (Settings)** > **Wi-Fi** > اضغط على علامة `(i)` بجانب الشبكة المتصل بها.
   - انزل إلى الأسفل واختر **تهيئة البروكسي (Configure Proxy)**.
   - اختر **تلقائي (Automatic)**.
   - ضع رابط الـ PAC الخاص بالمستخدم، مثل:
     `https://your-vercel-domain.vercel.app/pac/username_here`
   - اضغط **حفظ (Save)**.

2. **أجهزة Android**:
   - ادخل على تفاصيل شبكة الـ Wi-Fi > خيارات متقدمة > البروكسي > إعداد تلقائي (Proxy Auto-Config) وضع الرابط.

---

## ☁️ النشر على Vercel

1. قم بربط مستودع GitHub `shamcash-proxy-api` مع Vercel.
2. (اختياري) يمكنك إضافة المتغيرات البيئية التالية في لوحة Vercel Settings > Environment Variables:
   - `SUPABASE_URL`: رابط Supabase الخاص بك
   - `SUPABASE_KEY`: مفتاح Supabase الخاص بك
3. اضغط **Deploy**.
