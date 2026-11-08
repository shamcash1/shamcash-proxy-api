import express from 'express';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cnjsrlfggdviuzpgpnso.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_nlGdq-99HG3MYESfqmQQ3w_sW0KNrvf';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();

// Parse JSON and form data
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

// Main PAC Route: /pac/:username (also available as /api/pac/:username)
async function handlePacRequest(req, res) {
  const { username } = req.params;

  if (!username || username.trim() === '') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(getDirectPac());
  }

  try {
    const trimmedUsername = username.trim();

    // Query Supabase proxy_clients table
    const { data, error } = await supabase
      .from('proxy_clients')
      .select('id, username, is_active, expiry_date, proxy_host, proxy_port')
      .eq('username', trimmedUsername)
      .maybeSingle();

    if (error) {
      console.error(`[PAC] Supabase query error for ${trimmedUsername}:`, error.message);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(getDirectPac());
    }

    if (!data) {
      console.warn(`[PAC] Client not found: ${trimmedUsername}`);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(getDirectPac());
    }

    // Check is_active
    const isActive = data.is_active === true || data.is_active === 'true';

    // Check expiry_date >= today
    let isNotExpired = false;
    if (data.expiry_date) {
      // Normalize today to start of day (midnight) in UTC/local
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const clientExpiry = new Date(data.expiry_date);
      // Set expiry to end of that day (23:59:59.999) if only date provided
      if (!data.expiry_date.includes('T')) {
        clientExpiry.setHours(23, 59, 59, 999);
      }

      isNotExpired = clientExpiry >= today;
    }

    // Check proxy host and port
    const hasProxy = Boolean(data.proxy_host && data.proxy_port);

    if (isActive && isNotExpired && hasProxy) {
      console.log(`[PAC] Active proxy served for ${trimmedUsername} -> ${data.proxy_host}:${data.proxy_port}`);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(getShamCashPac(data.proxy_host, data.proxy_port));
    } else {
      console.log(`[PAC] Inactive/expired client ${trimmedUsername}: active=${isActive}, validDate=${isNotExpired}, hasProxy=${hasProxy}`);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(getDirectPac());
    }
  } catch (err) {
    console.error(`[PAC] Unexpected error for ${username}:`, err);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(getDirectPac());
  }
}

// PAC endpoints
app.get('/pac/:username', handlePacRequest);
app.get('/api/pac/:username', handlePacRequest);

// Status API for testing and frontend diagnostics
app.get('/api/client-status/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const { data, error } = await supabase
      .from('proxy_clients')
      .select('id, username, is_active, expiry_date, proxy_host, proxy_port')
      .eq('username', username.trim())
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({
        found: false,
        username,
        status: 'not_found',
        pac_mode: 'DIRECT'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clientExpiry = new Date(data.expiry_date);
    if (!data.expiry_date?.includes?.('T')) {
      clientExpiry.setHours(23, 59, 59, 999);
    }
    const isNotExpired = clientExpiry >= today;
    const isActive = data.is_active === true;
    const isEligible = isActive && isNotExpired && Boolean(data.proxy_host && data.proxy_port);

    return res.json({
      found: true,
      username: data.username,
      is_active: data.is_active,
      expiry_date: data.expiry_date,
      is_expired: !isNotExpired,
      is_eligible: isEligible,
      proxy_host: data.proxy_host,
      proxy_port: data.proxy_port,
      pac_mode: isEligible ? `PROXY ${data.proxy_host}:${data.proxy_port}` : 'DIRECT'
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
    timestamp: new Date().toISOString()
  });
});

// Export default app for Vercel Serverless Function (@vercel/node)
export default app;
