import express from 'express';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cnjsrlfggdviuzpgpnso.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_nlGdq-99HG3MYESfqmQQ3w_sW0KNrvf';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();

app.set('trust proxy', true);
app.use(express.json());

// Enable CORS for web clients and subscription apps (v2rayNG, V2Box, etc.)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper function to extract client IP address reliably on Vercel / proxies
function getCallerIp(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const raw = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    const firstIp = raw.split(',')[0].trim();
    if (firstIp) return firstIp.replace(/^::ffff:/, '');
  }

  const xVercelForwardedFor = req.headers['x-vercel-forwarded-for'];
  if (xVercelForwardedFor) {
    const raw = Array.isArray(xVercelForwardedFor) ? xVercelForwardedFor[0] : xVercelForwardedFor;
    const firstIp = raw.split(',')[0].trim();
    if (firstIp) return firstIp.replace(/^::ffff:/, '');
  }

  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp) {
    const raw = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    if (raw.trim()) return raw.trim().replace(/^::ffff:/, '');
  }

  const remoteAddr = req.ip || req.socket?.remoteAddress || '';
  return String(remoteAddr).replace(/^::ffff:/, '').trim() || 'unknown';
}

// Helper function to verify client subscription and IP binding
async function verifyAndBindClient(username, callerIp) {
  if (!username || username.trim() === '') {
    return { allowed: false, reason: 'invalid_username', client: null };
  }

  const trimmedUsername = username.trim();

  const { data, error } = await supabase
    .from('proxy_clients')
    .select('*')
    .eq('username', trimmedUsername)
    .maybeSingle();

  if (error || !data) {
    return { allowed: false, reason: 'not_found', client: null };
  }

  const isActive = data.is_active === true || data.is_active === 'true';

  let isNotExpired = false;
  if (data.expiry_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const clientExpiry = new Date(data.expiry_date);
    if (!String(data.expiry_date).includes('T')) {
      clientExpiry.setHours(23, 59, 59, 999);
    }

    isNotExpired = clientExpiry >= today;
  }

  const hasProxy = Boolean(data.proxy_host && data.proxy_port);

  if (!isActive || !isNotExpired || !hasProxy) {
    return { allowed: false, reason: 'inactive_or_expired', client: data };
  }

  // IP Binding check
  const registeredIp = data.registered_ip ? String(data.registered_ip).trim() : null;

  if (!registeredIp) {
    if (callerIp && callerIp !== 'unknown') {
      await supabase
        .from('proxy_clients')
        .update({
          registered_ip: callerIp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);
    }
    return { allowed: true, reason: 'bound_first_ip', client: data };
  }

  if (callerIp === registeredIp) {
    return { allowed: true, reason: 'ip_matched', client: data };
  }

  return { allowed: false, reason: 'ip_mismatch', client: data };
}

// Helper function to build Base64 Subscription URI for v2rayNG / V2Box
function buildSubscriptionBase64(client, protocol = 'socks') {
  // 1. استخراج بيانات البروكسي:
  const host = String(client.proxy_host).trim();
  const port = Number(client.proxy_port);
  const user = client.proxy_user || client.proxy_username;
  const pass = client.proxy_pass || client.proxy_password;

  const credentials = user && pass ? `${user}:${pass}@${host}:${port}` : `${host}:${port}`;

  // 2. التشفير الأول (الداخلي):
  const encodedCreds = Buffer.from(credentials, 'utf-8').toString('base64');

  // 3. بناء الرابط:
  const scheme = protocol === 'http' ? 'http' : 'socks';
  const uri = `${scheme}://${encodedCreds}#Shamcash-${client.username}`;

  // 4. التشفير الثاني (الخارجي للملف):
  const finalBase64 = Buffer.from(uri, 'utf-8').toString('base64');

  return finalBase64;
}

// ============================================================
// 1. SUBSCRIPTION ENDPOINT: GET /sub/:username
// Compatible with v2rayNG, V2Box, Streisand, Shadowrocket
// ============================================================
async function handleSubscriptionRequest(req, res) {
  const { username } = req.params;
  const callerIp = getCallerIp(req);
  const protocol = req.query.type === 'http' ? 'http' : 'socks';

  // 5. الإرسال (Headers ضرورية جداً):
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const result = await verifyAndBindClient(username, callerIp);

    if (!result.allowed || !result.client) {
      return res.status(200).send('');
    }

    const finalBase64 = buildSubscriptionBase64(result.client, protocol);
    return res.status(200).send(finalBase64);
  } catch (err) {
    console.error(`[SUB] Unexpected error for ${username}:`, err);
    return res.status(200).send('');
  }
}

app.get('/sub/:username', handleSubscriptionRequest);
app.get('/api/sub/:username', handleSubscriptionRequest);

// ============================================================
// 2. LEGACY PAC ENDPOINT: GET /pac/:username
// ============================================================
function getDirectPac() {
  return 'function FindProxyForURL(url, host) { return "DIRECT"; }\n';
}

function getShamCashPac(proxyHost, proxyPort) {
  return `function FindProxyForURL(url, host) {
    if (shExpMatch(host, "*api.shamcash.sy*") || 
        shExpMatch(host, "*bank.shamcash.sy*")) {
        return "PROXY ${proxyHost}:${proxyPort}";
    }
    return "DIRECT";
}
`;
}

async function handlePacRequest(req, res) {
  const { username } = req.params;
  const callerIp = getCallerIp(req);

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  try {
    const result = await verifyAndBindClient(username, callerIp);
    if (!result.allowed || !result.client) {
      return res.send(getDirectPac());
    }
    return res.send(getShamCashPac(result.client.proxy_host, result.client.proxy_port));
  } catch (err) {
    console.error(`[PAC] Unexpected error for ${username}:`, err);
    return res.send(getDirectPac());
  }
}

app.get('/pac/:username', handlePacRequest);
app.get('/api/pac/:username', handlePacRequest);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'shamcash-proxy-api',
    endpoints: ['/sub/:username', '/pac/:username'],
    ip_binding: 'enabled',
    caller_ip: getCallerIp(req),
    timestamp: new Date().toISOString(),
  });
});

export default app;
