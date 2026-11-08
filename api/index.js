import express from 'express';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cnjsrlfggdviuzpgpnso.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_nlGdq-99HG3MYESfqmQQ3w_sW0KNrvf';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();

app.set('trust proxy', true);
app.use(express.json());

// Enable CORS for web clients and tools
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

// Helper function to return fallback DIRECT PAC script
function getDirectPac() {
  return 'function FindProxyForURL(url, host) { return "DIRECT"; }\n';
}

// Helper function to build custom PAC script for Sham Cash
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

// Main PAC Route: /pac/:username (with IP Binding protection)
async function handlePacRequest(req, res) {
  const { username } = req.params;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (!username || username.trim() === '') {
    return res.send(getDirectPac());
  }

  try {
    const trimmedUsername = username.trim();
    const callerIp = getCallerIp(req);

    // 1. Find user in Supabase proxy_clients table
    const { data, error } = await supabase
      .from('proxy_clients')
      .select('*')
      .eq('username', trimmedUsername)
      .maybeSingle();

    if (error) {
      console.error(`[PAC] Supabase query error for ${trimmedUsername}:`, error.message);
      return res.send(getDirectPac());
    }

    if (!data) {
      console.warn(`[PAC] Client not found: ${trimmedUsername}`);
      return res.send(getDirectPac());
    }

    // 2. Verify client is active and expiry_date >= today
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
      console.log(
        `[PAC] Inactive or expired client ${trimmedUsername}: active=${isActive}, validDate=${isNotExpired}`
      );
      return res.send(getDirectPac());
    }

    // 3. IP Binding Verification
    const registeredIp = data.registered_ip ? String(data.registered_ip).trim() : null;

    if (!registeredIp) {
      // First device requesting the PAC URL: bind callerIp in registered_ip
      if (callerIp && callerIp !== 'unknown') {
        const { error: updateError } = await supabase
          .from('proxy_clients')
          .update({
            registered_ip: callerIp,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id);

        if (updateError) {
          console.error(
            `[PAC] Failed to bind IP ${callerIp} for ${trimmedUsername}:`,
            updateError.message
          );
        } else {
          console.log(`[PAC] Bound first device IP ${callerIp} for user ${trimmedUsername}`);
        }
      }

      return res.send(getShamCashPac(data.proxy_host, data.proxy_port));
    }

    // registered_ip is NOT null: compare callerIp with registeredIp
    if (callerIp === registeredIp) {
      console.log(
        `[PAC] IP match (${callerIp}) for ${trimmedUsername} -> serving PROXY ${data.proxy_host}:${data.proxy_port}`
      );
      return res.send(getShamCashPac(data.proxy_host, data.proxy_port));
    } else {
      console.warn(
        `[PAC] IP mismatch for ${trimmedUsername}: caller=${callerIp}, registered=${registeredIp} -> blocking (DIRECT)`
      );
      return res.send(getDirectPac());
    }
  } catch (err) {
    console.error(`[PAC] Unexpected error for ${username}:`, err);
    return res.send(getDirectPac());
  }
}

// PAC endpoints
app.get('/pac/:username', handlePacRequest);
app.get('/api/pac/:username', handlePacRequest);

// Status API for diagnostics
app.get('/api/client-status/:username', async (req, res) => {
  const { username } = req.params;
  const callerIp = getCallerIp(req);
  try {
    const { data, error } = await supabase
      .from('proxy_clients')
      .select('*')
      .eq('username', username.trim())
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({
        found: false,
        username,
        caller_ip: callerIp,
        status: 'not_found',
        pac_mode: 'DIRECT',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clientExpiry = new Date(data.expiry_date);
    if (!String(data.expiry_date || '').includes('T')) {
      clientExpiry.setHours(23, 59, 59, 999);
    }
    const isNotExpired = clientExpiry >= today;
    const isActive = data.is_active === true;
    const registeredIp = data.registered_ip ? String(data.registered_ip).trim() : null;
    const ipAllowed = !registeredIp || registeredIp === callerIp;
    const isEligible =
      isActive && isNotExpired && Boolean(data.proxy_host && data.proxy_port) && ipAllowed;

    return res.json({
      found: true,
      username: data.username,
      is_active: data.is_active,
      expiry_date: data.expiry_date,
      is_expired: !isNotExpired,
      registered_ip: registeredIp,
      caller_ip: callerIp,
      ip_match: ipAllowed,
      is_eligible: isEligible,
      proxy_host: data.proxy_host,
      proxy_port: data.proxy_port,
      pac_mode: isEligible ? `PROXY ${data.proxy_host}:${data.proxy_port}` : 'DIRECT',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'shamcash-proxy-api',
    ip_binding: 'enabled',
    caller_ip: getCallerIp(req),
    timestamp: new Date().toISOString(),
  });
});

export default app;
