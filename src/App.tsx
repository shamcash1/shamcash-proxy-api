import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  Copy, 
  Check, 
  ExternalLink, 
  Play, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Smartphone, 
  Code2, 
  Globe, 
  Github, 
  CheckCircle2, 
  Layers,
  Terminal,
  Zap,
  RefreshCw
} from 'lucide-react';

const SUPABASE_URL = 'https://cnjsrlfggdviuzpgpnso.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nlGdq-99HG3MYESfqmQQ3w_sW0KNrvf';
const GITHUB_REPO_URL = 'https://github.com/shamcash1/shamcash-proxy-api';

const SQL_SCHEMA = `-- ============================================================
-- Sham Cash PAC Proxy System - Supabase SQL Schema
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

-- 2. إنشاء مؤشر للبحث السريع بحسب اسم المستخدم
CREATE INDEX IF NOT EXISTS idx_proxy_clients_username ON public.proxy_clients (username);

-- 3. تفعيل حماية السجلات (RLS)
ALTER TABLE public.proxy_clients ENABLE ROW LEVEL SECURITY;

-- 4. إتاحة القراءة لمفتاح API لاستخراج إعدادات الـ PAC
CREATE POLICY "Allow public read on proxy_clients" 
ON public.proxy_clients 
FOR SELECT 
USING (true);

-- 5. إدراج بيانات تجريبية (نشط / منتهي / موقوف)
INSERT INTO public.proxy_clients (username, is_active, expiry_date, proxy_host, proxy_port)
VALUES 
    ('user_active', true, (CURRENT_DATE + INTERVAL '30 days')::date, '185.190.140.20', 8080),
    ('user_expired', true, (CURRENT_DATE - INTERVAL '5 days')::date, '185.190.140.20', 8080),
    ('user_inactive', false, (CURRENT_DATE + INTERVAL '30 days')::date, '185.190.140.20', 8080)
ON CONFLICT (username) DO NOTHING;`;

export default function App() {
  const [activeTab, setActiveTab] = useState<'tester' | 'sql' | 'git' | 'guide'>('tester');
  const [testUsername, setTestUsername] = useState('user_active');
  const [loading, setLoading] = useState(false);
  const [pacResult, setPacResult] = useState<string>('');
  const [statusResult, setStatusResult] = useState<any>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedPac, setCopiedPac] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch PAC script directly from the API endpoint
  const testPacEndpoint = async (userToTest: string) => {
    if (!userToTest.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const trimmed = userToTest.trim();
      // Test the live /pac/:username endpoint
      const pacRes = await fetch(`/pac/${encodeURIComponent(trimmed)}`);
      const pacText = await pacRes.text();
      setPacResult(pacText);

      // Test diagnostics endpoint
      try {
        const statusRes = await fetch(`/api/client-status/${encodeURIComponent(trimmed)}`);
        const statusJson = await statusRes.json();
        setStatusResult(statusJson);
      } catch {
        setStatusResult(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء فحص الرابط');
      setPacResult('function FindProxyForURL(url, host) { return "DIRECT"; }');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testPacEndpoint(testUsername);
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyPac = () => {
    navigator.clipboard.writeText(pacResult);
    setCopiedPac(true);
    setTimeout(() => setCopiedPac(false), 2000);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const currentHost = typeof window !== 'undefined' ? window.location.origin : '';
  const currentPacUrl = `${currentHost}/pac/${testUsername}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-xl">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base md:text-lg text-white">شام كاش • Sham Cash Dynamic PAC API</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Vercel Serverless
                </span>
              </div>
              <p className="text-xs text-slate-400">توجيه ذكي لتطبيق شام كاش بناءً على اشتراكات Supabase</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a 
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Github className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">shamcash-proxy-api</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Badge Strip */}
      <section className="border-b border-slate-800/80 bg-gradient-to-r from-emerald-950/30 via-slate-900/50 to-teal-950/30">
        <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400">قاعدة البيانات</div>
              <div className="font-semibold text-slate-200 truncate">Supabase PostgreSQL</div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-sky-500/10 text-sky-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400">خادم المعالجة</div>
              <div className="font-semibold text-slate-200">Express + Vercel</div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400">نطاقات التوجيه</div>
              <div className="font-semibold text-slate-200" dir="ltr">*.shamcash.sy</div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-purple-500/10 text-purple-400">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400">مستودع GitHub</div>
              <div className="font-semibold text-slate-200">تم الرفع بنجاح ✓</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('tester')}
            className={`pb-3 px-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'tester'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-4 h-4" />
            فحص وتجربة ملف الـ PAC المباشر
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-3 px-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'sql'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            كود قاعدة البيانات (SQL)
          </button>

          <button
            onClick={() => setActiveTab('git')}
            className={`pb-3 px-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'git'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-4 h-4" />
            المستودع ورفع GitHub
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'guide'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            دليل إعداد هواتف العملاء
          </button>
        </div>

        {/* TAB 1: PAC TESTER */}
        {activeTab === 'tester' && (
          <div className="space-y-6">
            {/* Input card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Play className="w-4 h-4 text-emerald-400" />
                    اختبار الاستعلام وتوليد كود الـ PAC
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    أدخل اسم المستخدم للبحث عنه في جدول <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">proxy_clients</code> والتحقق من حالة حسابه وتاريخ انتهائه
                  </p>
                </div>

                {/* Preset quick test buttons */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 text-xs">أمثلة سريعة:</span>
                  <button
                    onClick={() => {
                      setTestUsername('user_active');
                      testPacEndpoint('user_active');
                    }}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md"
                  >
                    user_active (نشط)
                  </button>
                  <button
                    onClick={() => {
                      setTestUsername('user_expired');
                      testPacEndpoint('user_expired');
                    }}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-md"
                  >
                    user_expired (منتهي)
                  </button>
                  <button
                    onClick={() => {
                      setTestUsername('user_inactive');
                      testPacEndpoint('user_inactive');
                    }}
                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-md"
                  >
                    user_inactive (موقوف)
                  </button>
                </div>
              </div>

              {/* Form Input */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 text-sm" dir="ltr">
                    /pac/
                  </span>
                  <input
                    type="text"
                    value={testUsername}
                    onChange={(e) => setTestUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && testPacEndpoint(testUsername)}
                    placeholder="اسم المستخدم مثل: 3lishops"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pr-14 pl-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    dir="ltr"
                  />
                </div>

                <button
                  onClick={() => testPacEndpoint(testUsername)}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      جاري الفحص...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      فحص وتوليد الـ PAC
                    </>
                  )}
                </button>
              </div>

              {/* Public URL to share with client */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>الرابط المباشر للعميل:</span>
                  <code className="text-emerald-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 select-all" dir="ltr">
                    {currentPacUrl}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyUrl(currentPacUrl)}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded border border-slate-700 transition-colors"
                  >
                    {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>نسخ الرابط</span>
                  </button>
                  <a
                    href={`/pac/${testUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded border border-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>فتح في تبويب جديد</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Diagnostics status and Output */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Account Status Card */}
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  حالة الحساب في Supabase
                </h3>

                {statusResult ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">اسم المستخدم</span>
                      <span className="font-mono font-medium text-slate-200" dir="ltr">{statusResult.username}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">الحالة (is_active)</span>
                      {statusResult.is_active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          مفعّل (true)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-medium bg-rose-500/10 px-2 py-0.5 rounded">
                          <ShieldAlert className="w-3 h-3" />
                          موقوف (false)
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">تاريخ الانتهاء</span>
                      <span className="font-mono text-slate-200" dir="ltr">{statusResult.expiry_date || 'غير محدد'}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">صلاحية التاريخ</span>
                      {!statusResult.is_expired ? (
                        <span className="text-emerald-400 font-medium">ساري المفعول ✓</span>
                      ) : (
                        <span className="text-amber-400 font-medium">منتهي الصلاحية ✕</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">البروكسي المخصص</span>
                      <span className="font-mono text-cyan-400" dir="ltr">
                        {statusResult.proxy_host ? `${statusResult.proxy_host}:${statusResult.proxy_port}` : 'غير متوفر'}
                      </span>
                    </div>

                    <div className="pt-2">
                      <div className="text-slate-400 mb-1">النتيجة النهائية للملف:</div>
                      <div className={`p-2.5 rounded-lg border font-mono text-center text-xs font-semibold ${
                        statusResult.is_eligible 
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}>
                        {statusResult.pac_mode}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs space-y-2">
                    <p className="text-amber-400 font-medium">
                      {errorMsg || 'لم يتم العثور على المستخدم أو الجدول لم يتم إنشاؤه بعد'}
                    </p>
                    <p className="text-slate-500 leading-relaxed">
                      إذا لم تكن قد نفذت كود الـ SQL في Supabase بعد، توجه لتبويب <button onClick={() => setActiveTab('sql')} className="text-emerald-400 underline">كود قاعدة البيانات</button> لتنفيذه في لوحة تحكم Supabase.
                    </p>
                  </div>
                )}
              </div>

              {/* Code PAC Output */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      استجابة ملف الـ PAC الناتجة (text/plain)
                    </span>
                  </div>

                  <button
                    onClick={handleCopyPac}
                    className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded transition-colors"
                  >
                    {copiedPac ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPac ? 'تم النسخ!' : 'نسخ الكود'}</span>
                  </button>
                </div>

                <div className="p-4 flex-1 bg-slate-950">
                  <pre className="font-mono text-xs sm:text-sm text-emerald-300/90 whitespace-pre-wrap leading-relaxed" dir="ltr">
                    {pacResult || '// جاري جلب ملف الـ PAC...'}
                  </pre>
                </div>

                <div className="px-4 py-2.5 bg-slate-900/60 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>النوع: Content-Type: text/plain; charset=utf-8</span>
                  <span className="text-slate-400">
                    {pacResult.includes('PROXY') ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        توجيه محدد لشام كاش عبر البروكسي
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        اتصال مباشر (DIRECT) لعدم أهلية الحساب
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SQL SCHEMA */}
        {activeTab === 'sql' && (
          <div className="space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    كود إنشاء جدول proxy_clients في Supabase
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    انسخ هذا الكود بالكامل، وافتحه في <strong>SQL Editor</strong> داخل لوحة تحكم مشروع Supabase ثم اضغط <strong>RUN</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySql}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                  >
                    {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSql ? 'تم نسخ كود الـ SQL !' : 'نسخ كود SQL كامل'}</span>
                  </button>

                  <a
                    href="https://supabase.com/dashboard/project/cnjsrlfggdviuzpgpnso/sql"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>فتح Supabase SQL Editor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Explanatory notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="text-emerald-400 font-semibold mb-1">1. الحقول المطلوبة</div>
                  <div className="text-slate-400 text-[11px] leading-relaxed">
                    يتضمن الحقول: id, username, is_active, expiry_date, proxy_host, proxy_port.
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="text-sky-400 font-semibold mb-1">2. سياسة الأمان RLS</div>
                  <div className="text-slate-400 text-[11px] leading-relaxed">
                    يتم تفعيل الـ RLS مع سياسة SELECT عامة لقراءة البروكسي بواسطة مفتاح الـ API.
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="text-purple-400 font-semibold mb-1">3. سرعة استجابة فائقة</div>
                  <div className="text-slate-400 text-[11px] leading-relaxed">
                    تمت إضافة الفهرس idx_proxy_clients_username لضمان جلب ملف الـ PAC في أجزاء من الثانية.
                  </div>
                </div>
              </div>

              {/* Code viewer */}
              <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                <pre className="p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto selection:bg-emerald-600" dir="ltr">
                  {SQL_SCHEMA}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GITHUB REPO STATUS */}
        {activeTab === 'git' && (
          <div className="space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Github className="w-5 h-5 text-emerald-400" />
                  مستودع المشروع على GitHub
                </h2>
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تم الإنشاء والرفع بنجاح
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">رابط المستودع الرسمي:</div>
                    <a
                      href={GITHUB_REPO_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 text-sm font-mono font-semibold flex items-center gap-1.5"
                      dir="ltr"
                    >
                      {GITHUB_REPO_URL}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    زيارة المستودع على GitHub
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-300">الملفات المرفوعة إلى المستودع:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between" dir="ltr">
                    <span className="font-mono text-emerald-400">api/index.js</span>
                    <span className="text-slate-400 text-[11px]" dir="rtl">خادم Express & PAC</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between" dir="ltr">
                    <span className="font-mono text-emerald-400">vercel.json</span>
                    <span className="text-slate-400 text-[11px]" dir="rtl">إعدادات استضافة Vercel</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between" dir="ltr">
                    <span className="font-mono text-emerald-400">package.json</span>
                    <span className="text-slate-400 text-[11px]" dir="rtl">الاعتماديات والمكتبات</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between" dir="ltr">
                    <span className="font-mono text-emerald-400">schema.sql</span>
                    <span className="text-slate-400 text-[11px]" dir="rtl">كود قاعدة بيانات Supabase</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between" dir="ltr">
                    <span className="font-mono text-emerald-400">README.md</span>
                    <span className="text-slate-400 text-[11px]" dir="rtl">دليل الاستخدام الكامل</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between" dir="ltr">
                    <span className="font-mono text-emerald-400">.env.example</span>
                    <span className="text-slate-400 text-[11px]" dir="rtl">متغيرات البيئة للنسخ</span>
                  </div>
                </div>
              </div>

              {/* Vercel 1-click deployment instructions */}
              <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  خطوات نشر المشروع على Vercel في دقيقة واحدة:
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed">
                  <li>ادخل على موقع <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-emerald-400 underline">vercel.com/new</a>.</li>
                  <li>اختر مستودع <strong>shamcash-proxy-api</strong> من قائمة مستودعاتك في GitHub.</li>
                  <li>اضغط على زر <strong>Deploy</strong> مباشرة (الملف <code>vercel.json</code> سيتكفل بكافة إعدادات الـ Serverless تلقائياً).</li>
                  <li>بعد اكتمال النشر، ستحصل على رابط رسمي مثل: <code className="text-emerald-300 bg-slate-900 px-1 rounded" dir="ltr">https://shamcash-proxy-api.vercel.app/pac/:username</code></li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CLIENT DEVICE SETUP GUIDE */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* iOS Guide */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                    
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">أجهزة آيفون وآيباد (iOS)</h3>
                    <p className="text-xs text-slate-400">إعداد البروكسي التلقائي للشبكة</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-[11px] shrink-0 font-bold">1</span>
                    <p>افتح <strong>الإعدادات (Settings)</strong> ثم اختر <strong>Wi-Fi</strong>.</p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-[11px] shrink-0 font-bold">2</span>
                    <p>اضغط على أيقونة <strong>(i)</strong> الزرقاء بجانب اسم شبكة الواي فاي المتصل بها.</p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-[11px] shrink-0 font-bold">3</span>
                    <p>انزل لأسفل الصفحة واختر <strong>تهيئة البروكسي (Configure Proxy)</strong>.</p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-[11px] shrink-0 font-bold">4</span>
                    <p>اختر الخيار <strong>تلقائي (Automatic)</strong>.</p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-[11px] shrink-0 font-bold">5</span>
                    <div className="flex-1">
                      <p>في خانة <strong>عنوان URL</strong> ضع رابط العميل الخاص به:</p>
                      <code className="block mt-1.5 p-2 bg-slate-950 border border-slate-800 rounded text-emerald-400 font-mono text-[11px] break-all select-all" dir="ltr">
                        {currentHost}/pac/اسم_المستخدم
                      </code>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-[11px] shrink-0 font-bold">6</span>
                    <p>اضغط <strong>حفظ (Save)</strong> في أعلى اليمين. الآن سيعمل تطبيق شام كاش مباشرة!</p>
                  </div>
                </div>
              </div>

              {/* Android Guide */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    🤖
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">أجهزة أندرويد (Android)</h3>
                    <p className="text-xs text-slate-400">إعداد البروكسي التلقائي PAC</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-[11px] shrink-0 font-bold">1</span>
                    <p>افتح <strong>الإعدادات</strong> ثم ادخل على قسم <strong>Wi-Fi</strong>.</p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-[11px] shrink-0 font-bold">2</span>
                    <p>اضغط مطولاً على شبكة الواي فاي أو اضغط على أيقونة الترس ⚙️ بجانبها ثم <strong>تعديل الشبكة</strong>.</p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-[11px] shrink-0 font-bold">3</span>
                    <p>افتح <strong>خيارات متقدمة (Advanced options)</strong>.</p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-[11px] shrink-0 font-bold">4</span>
                    <p>عند حقل <strong>البروكسي (Proxy)</strong> اختر <strong>إعداد تلقائي (Proxy Auto-Config)</strong>.</p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-[11px] shrink-0 font-bold">5</span>
                    <div className="flex-1">
                      <p>في خانة <strong>عنوان URL لإعداد الـ PAC</strong> ضع رابط العميل:</p>
                      <code className="block mt-1.5 p-2 bg-slate-950 border border-slate-800 rounded text-emerald-400 font-mono text-[11px] break-all select-all" dir="ltr">
                        {currentHost}/pac/اسم_المستخدم
                      </code>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-[11px] shrink-0 font-bold">6</span>
                    <p>اضغط <strong>حفظ (Save)</strong>.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works Explanation Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold text-sm text-white mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                كيف يعمل نظام التوجيه الذكي في ملف الـ PAC؟
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                ملف الـ PAC (Proxy Auto-Configuration) هو نص برمجي JavaScript قياسي معتمد عالمياً في جميع أنظمة التشغيل (iOS, Android, Windows, macOS). تقوم الأنظمة بتحميله لتحديد أي مسارات تمر عبر البروكسي وأي مسارات تمر مباشرة:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-emerald-400 font-semibold mb-1">
                    🟢 طلبات شام كاش (*.shamcash.sy)
                  </div>
                  <div className="text-slate-400 text-[11px] leading-relaxed">
                    يتم تحويلها حصرياً إلى سيرفر البروكسي السوري الخاص بالعميل <code className="text-emerald-300" dir="ltr">PROXY host:port</code> لفتح التطبيق بدون أي قيود جغرافية.
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-sky-400 font-semibold mb-1">
                    🌐 باقي التطبيقات والمواقع (WhatsApp, YouTube, إلخ)
                  </div>
                  <div className="text-slate-400 text-[11px] leading-relaxed">
                    تتصل مباشرة <code className="text-sky-300">DIRECT</code> عبر إنترنت الهاتف العادي بدون استهلاك بيانات البروكسي وبدون أي بطء.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 mt-12 py-6 bg-slate-950 text-slate-400 text-xs text-center">
        <p>مشروع شام كاش بروكسي • جاهز للنشر على Vercel و Supabase</p>
        <p className="text-slate-400 mt-1" dir="ltr">GitHub Repository: shamcash1/shamcash-proxy-api</p>
      </footer>
    </div>
  );
}
