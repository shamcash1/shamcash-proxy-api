-- ============================================================
-- Sham Cash PAC Proxy System - Supabase SQL Schema
-- كود إنشاء جدول proxy_clients وسياسات الأمان في Supabase
-- ============================================================

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

-- 2. إنشاء مؤشر فهرسة للبحث السريع بواسطة اسم المستخدم (username)
CREATE INDEX IF NOT EXISTS idx_proxy_clients_username ON public.proxy_clients (username);

-- 3. تفعيل نظام حماية السجلات (Row Level Security - RLS)
ALTER TABLE public.proxy_clients ENABLE ROW LEVEL SECURITY;

-- 4. سياسة السماح بالقراءة (SELECT) باستخدام مفتاح Supabase المعلن
-- لكي يتمكن خادم الـ API وسيرفر PAC من الاستعلام عن حساب العميل
CREATE POLICY "Allow public read on proxy_clients" 
ON public.proxy_clients 
FOR SELECT 
USING (true);

-- 5. نماذج لبيانات تجريبية لاختبار الحالات المختلفة
-- عميل نشط وساري المفعول (سيعيد PROXY host:port)
INSERT INTO public.proxy_clients (username, is_active, expiry_date, proxy_host, proxy_port)
VALUES ('user_active', true, (CURRENT_DATE + INTERVAL '30 days')::date, '185.190.140.20', 8080)
ON CONFLICT (username) DO UPDATE 
SET is_active = EXCLUDED.is_active, 
    expiry_date = EXCLUDED.expiry_date, 
    proxy_host = EXCLUDED.proxy_host, 
    proxy_port = EXCLUDED.proxy_port;

-- عميل منتهي الصلاحية (سيعيد DIRECT)
INSERT INTO public.proxy_clients (username, is_active, expiry_date, proxy_host, proxy_port)
VALUES ('user_expired', true, (CURRENT_DATE - INTERVAL '5 days')::date, '185.190.140.20', 8080)
ON CONFLICT (username) DO UPDATE 
SET is_active = EXCLUDED.is_active, 
    expiry_date = EXCLUDED.expiry_date;

-- عميل موقوف (is_active = false) (سيعيد DIRECT)
INSERT INTO public.proxy_clients (username, is_active, expiry_date, proxy_host, proxy_port)
VALUES ('user_inactive', false, (CURRENT_DATE + INTERVAL '30 days')::date, '185.190.140.20', 8080)
ON CONFLICT (username) DO UPDATE 
SET is_active = EXCLUDED.is_active;
