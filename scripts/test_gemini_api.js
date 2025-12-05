#!/usr/bin/env node
/**
 * Simple script to test Google Generative AI / Gemini endpoint with an API key.
 * Usage:
 *  - Run with env var:
 *      $env:GOOGLE_API_KEY = '<API_KEY>'    (PowerShell)
 *      export GOOGLE_API_KEY='<API_KEY>'    (macOS / Linux)
 *      node scripts/test_gemini_api.js
 *  - Or pass the key as a command line flag:
 *      node scripts/test_gemini_api.js --key=AIza...
 *
 * NOTE: Do NOT commit your API key. Put it in an env var or a local .env file and add to .gitignore.
 */

const https = require('https');
const { URL } = require('url');

function readArg(key) {
  const arg = process.argv.find(arg => arg.startsWith(`--${key}=`));
  if (!arg) return undefined;
  return arg.split('=')[1];
}

const API_KEY = readArg('key') || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GCLOUD_API_KEY || process.env.GENERATIVE_API_KEY;
if (!API_KEY) {
  console.error('No API key found. Set GOOGLE_API_KEY env var or pass --key=API_KEY');
  process.exit(1);
}

// A list of model names to try. Use whichever the project supports. If one fails, the script continues.
const modelsToTry = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash',
  'text-bison-001',
  'text-bison@001'
];
// Add Gemini 2.5 flash model variants per user's note
modelsToTry.push('gemini-2.5-flash');
modelsToTry.push('gemini-2.5-flash@1');
modelsToTry.push('models/gemini-2.5-flash');
modelsToTry.push('projects/959794132691/locations/global/models/gemini-2.5-flash');

const prompt = 'Hello! This is a test query from a script to check API key access. Please respond with a short success message.';

async function generateText(model) {
  // Try typical Generative AI API endpoints for text generation
  // Prefer the Generative Language API host (`generativelanguage.googleapis.com`) and keep `generativeai.googleapis.com` as a fallback
  const hosts = ['generativelanguage.googleapis.com', 'generativeai.googleapis.com'];
  const pathTemplates = [
    '/v1/models/{model}:generateContent',
    '/v1/models/{model}:generateText',
    '/v1/models/{model}:generate',
  ];
  // try each host and path template to be resilient against different API flavors / regions
  const tried = [];
  for (const host of hosts) {
    for (const t of pathTemplates) {
      const pathname = t.replace('{model}', encodeURIComponent(model));
      const url = new URL(`https://${host}${pathname}`);
      url.searchParams.set('key', API_KEY);
      tried.push(url.toString());
    }
  }

  // For generateContent/generateText endpoints the request shape may vary. We'll try the common shape the API accepts.
  // Try multiple possible request bodies since the API surface varies
  const bodyCandidates = [
    { prompt },
    { input: prompt },
    { text: prompt },
    { text: { prompt } },
    { messages: [{ content: prompt }] },
    { instances: [{ text: prompt }] },
    { input: { text: prompt } },
  ];

  // HTTPS request options: base options (Content-Length will be added per payload)
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  // attempt sequentially through hosts
  return new Promise(async (resolve) => {
    for (const tUrl of tried) {
      try {
        let r;
        for (const b of bodyCandidates) {
          try {
            const payload = JSON.stringify({ ...b, maxOutputTokens: 256, temperature: 0.2 });
            const thisOptions = { ...options, headers: { ...options.headers, 'Content-Length': Buffer.byteLength(payload) } };
            r = await new Promise((resResolve, resReject) => {
              const req = https.request(tUrl, thisOptions, res => {
                let data = '';
                res.on('data', chunk => (data += chunk));
                res.on('end', () => {
                  try {
                    const parsed = JSON.parse(data);
                    resResolve({ status: res.statusCode, body: parsed, payload });
                  } catch (e) {
                    resResolve({ status: res.statusCode, body: data, payload });
                  }
                });
              });
              req.on('error', (err) => resReject(err));
              req.write(payload);
              req.end();
            });
            // If a model returns a 200-range or 4xx with json body, we return it to the caller; else try other body shapes
            if (r && r.status && r.status < 500) {
              break;
            }
          } catch (err) {
            // log and try the next body shape
            console.warn('Attempt with a different request body failed:', err.message || err);
            continue;
          }
        }
        // if one host returned a non-404, return it — else try next host
        resolve({ url: tUrl, ...r });
        return;
      } catch (requestErr) {
        // fallback to next host
        // If error is important (e.g., network error), collect it via console.warn
        console.warn(`Host ${tUrl} request failed:`, (requestErr && requestErr.message) || requestErr);
      }
    }
    // none of the hosts worked
    resolve({ url: tried[0], status: 0, body: 'No hosts responded successfully' });
  });
  // End sequential host attempts
}

async function listModels() {
  // Prefer the Generative Language API host (current) and keep generativeai as a fallback
  const hosts = ['generativelanguage.googleapis.com', 'generativeai.googleapis.com'];
  const tried = hosts.map(host => `https://${host}/v1/models?key=${API_KEY}`);
  const results = [];
  for (const urlStr of tried) {
    try {
      const r = await new Promise((resolve, reject) => {
        const req = https.get(urlStr, (res) => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
            catch { resolve({ status: res.statusCode, body: data }); }
          });
        });
        req.on('error', reject);
      });
      results.push({ url: urlStr.replace(/(key=)([^&]+)/, '$1<REDACTED>'), ...r });
    } catch (err) {
      results.push({ url: urlStr.replace(/(key=)([^&]+)/, '$1<REDACTED>'), status: 0, body: String(err) });
    }
  }
  return results;
}

async function tryVertexPredict(model) {
  // Vertex AI endpoint typically uses a different path and requires an OAuth Bearer token
  const token = process.env.GCP_ACCESS_TOKEN;
  const projectId = process.env.GCP_PROJECT_ID || '959794132691';
  const location = process.env.GCP_LOCATION || 'us-central1';
  if (!token) return { status: 0, body: 'No GCP_ACCESS_TOKEN set for Vertex predict test' };
  // path: POST https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT/locations/LOCATION/publishers/google/models/MODEL:predict
  const host = `${location}-aiplatform.googleapis.com`;
  const pathname = `/v1/projects/${projectId}/locations/${location}/publishers/google/models/${encodeURIComponent(model)}:predict`;
  const url = new URL(`https://${host}${pathname}`);
  const body = JSON.stringify({ instances: [{ content: prompt }], parameters: { temperature: 0.2, maxOutputTokens: 128 } });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Authorization': `Bearer ${token}`
    }
  };

  return new Promise((resolve) => {
    const req = https.request(url, options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ url: url.toString(), status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ url: url.toString(), status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', (err) => resolve({ url: url.toString(), status: 0, body: String(err) }));
    req.write(body);
    req.end();
  });
}

function extractTextFromBody(body) {
  // Look for common generation response shapes and return a short excerpt
  try {
    if (!body) return null;
    // common: generativelanguage -> candidates or output
    if (Array.isArray(body.candidates) && body.candidates.length > 0) {
      const cand = body.candidates[0];
      if (typeof cand === 'string') return cand;
      if (typeof cand.content === 'string') return cand.content;
      if (cand.output && Array.isArray(cand.output) && cand.output.length) return cand.output.map(o => o.content || o).join('\n');
    }
    // common: output -> content
    if (body.output) {
      if (typeof body.output === 'string') return body.output;
      if (Array.isArray(body.output)) return body.output.map(o => o.content || JSON.stringify(o)).join('\n');
    }
    // Vertex predict style: predictions or instances
    if (Array.isArray(body.predictions) && body.predictions.length > 0) {
      const p = body.predictions[0];
      if (typeof p === 'string') return p;
      if (p.content) return p.content;
      if (p.text) return p.text;
    }
    if (Array.isArray(body.instances) && body.instances.length > 0) {
      const i = body.instances[0];
      if (i.content) return i.content;
      if (i.text) return i.text;
    }
    // try to find the first string value anywhere
    const q = JSON.stringify(body);
    if (q && q.length) return q.slice(0, 2000);
  } catch (e) { return null; }
  return null;
}

function analyzeError(status, body) {
  // Return friendly guidance based on status and error content
  if (!body) {
    if (status === 0) return 'No response received. Check network / firewall / DNS.';
    if (status === 404) return 'Endpoint not found (404). Ensure you are using the generativelanguage API and the model name is correct (use listModels to inspect available IDs).';
    if (status === 503) return 'Service temporarily unavailable (503). Try again later or check system status.';
    return `Unexpected status code: ${status}`;
  }
  const errMsg = (body && body.error && body.error.message) ? body.error.message : (typeof body === 'string' ? body : JSON.stringify(body).slice(0,500));
  if (status === 400) {
    if (errMsg && errMsg.toLowerCase().includes('api key not valid')) return 'Invalid API key or expired key. Revoke and generate a new key and ensure it has access to Generative Language API.';
    return `Bad request (400): ${errMsg}. Verify the request body and model name.`;
  }
  if (status === 401 || status === 403) {
    if (errMsg && errMsg.toLowerCase().includes('api key not valid')) return 'API key invalid or unauthorized. Ensure the key is valid, the Generative Language API is enabled and the key is not restricted to a different project/host.';
    if (errMsg && errMsg.toLowerCase().includes('permission')) return 'Permission error; enable the API and ensure the key has permission to use Generative Language/Vertex.';
    return `Unauthorized (status ${status}): ${errMsg}. Check key and project access.`;
  }
  if (status === 404) return '404 Not Found: The model id or endpoint is not available in the chosen host/version. Use the `listModels` output to find canonical model ids.';
  if (status >= 500) return `Server error (${status}): ${errMsg}. Try again later or contact Google Cloud support.`;
  return `Status ${status}: ${errMsg}`;
}

(async () => {
  console.log('Testing Generative AI / Gemini API with your API key...');
  console.log('\nAttempting to list models with the API key (if allowed)...');
  const listings = await listModels();
  // Collect discovered model ids from listings
  const discovered = new Set();
  listings.forEach(l => {
    console.log('\nHost:', l.url);
    console.log('Status:', l.status);
    if (typeof l.body === 'object') {
      console.log('Body keys:', Object.keys(l.body));
      if (Array.isArray(l.body.models)) {
        const names = l.body.models.map(m => m.name || m.model || m.id || m.displayName || (m && m.split && m) || JSON.stringify(m));
        console.log('Returned models (first 20 ids):', names.slice(0,20));
        names.forEach(n => discovered.add(n));
      }
    } else console.log('Body:', String(l.body).slice(0, 1000));
  });
  // If we discovered Gemini models, prefer them first
  const geminiCandidates = [...discovered].filter(n => typeof n === 'string' && /gemini-.+flash/i.test(n));
  if (geminiCandidates.length > 0) {
    console.log('Discovered gemini models from listModels:', geminiCandidates.slice(0, 10));
    // Unshift to the beginning of modelsToTry (but avoid duplicates)
    geminiCandidates.forEach(g => { if (!modelsToTry.includes(g)) modelsToTry.unshift(g); });
  }
  const successes = new Set();
  for (const model of modelsToTry) {
    try {
      console.log('\nTrying model:', model);
      console.log('(masked key will not be printed)');
      const r = await generateText(model);
      const endpointPrinted = (r.url || '').replace(/(key=)([^&]+)/i, '$1<REDACTED>');
      console.log('Endpoint:', endpointPrinted);
      console.log('HTTP status:', r.status);
      // Check for helpful response text
      const extracted = extractTextFromBody(r.body);
      if (extracted) {
        console.log('\nExtracted text sample:', String(extracted).slice(0, 1000));
      }
      if (r.status && r.status >= 400) {
        console.log('Suggestion:', analyzeError(r.status, r.body));
      }
      if (typeof r.body === 'object') {
        console.log('Response keys:', Object.keys(r.body));
        console.log('Response sample:', JSON.stringify(r.body, null, 2).slice(0, 2000));
      } else {
        // raw text response
        console.log('Body:', r.body);
      }
      // Also try Vertex predict style if GCP_ACCESS_TOKEN is present
      if (process.env.GCP_ACCESS_TOKEN) {
        console.log('\nTrying Vertex predict for same model (requires OAuth token)');
        const v = await tryVertexPredict(model);
        console.log('Vertex URL:', (v.url || '').replace(/(access_token=)([^&]+)/, '$1<REDACTED>'));
        console.log('Vertex status:', v.status);
        if (typeof v.body === 'object') console.log('Vertex response keys:', Object.keys(v.body));
        const vExtracted = extractTextFromBody(v.body);
        if (vExtracted) console.log('Vertex response sample:', vExtracted);
        if (v.status && v.status >= 400) console.log('Vertex suggestion:', analyzeError(v.status, v.body));
      }
      // Record success
      if (r && r.status && r.status >= 200 && r.status < 300) {
        successes.add(model);
      }
    } catch (err) {
      console.warn('Request failed for model', model, err.message || err);
    }
  }
  if (successes.size > 0) {
    console.log('\nSuccess! Models that responded with HTTP 2xx: ', Array.from(successes));
  } else console.log('\nNo model returned HTTP 2xx. If you saw 404s, verify model access in your project or use listModels to find canonical model IDs.');
  // Add checklist for common reasons the key may not work
  if (successes.size === 0) {
    console.log('\nTroubleshooting checklist:');
    console.log('- Ensure your API key is valid and not expired.');
    console.log('- Check that the Generative Language API is enabled in GCP (APIs & Services > Enable APIs and Services).');
    console.log('- Verify the API key restrictions: the key must not be locked to a referer/IP that prevents your test runner.');
    console.log('- If using Vertex/Model Garden, confirm you have access to the targeted model and that it’s in the correct region and project.');
    console.log('- Check billing and project quotas; Enabling APIs must be paired with an active billing account for some services.');
    console.log('- If you used a key in the terminal earlier, consider revoking it and creating a new restricted key.');
  }
  console.log('\nDone. If you saw HTTP 200 and a model result, the key works for that model/endpoint.');
})();
