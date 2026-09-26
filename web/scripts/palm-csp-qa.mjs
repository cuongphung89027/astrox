/**
 * AstroX QA — production-equivalent CSP + real MediaPipe runtime gate for /chitay.
 *
 * Runs the ACTUAL middleware `onRequest` from functions/[[path]].js against the
 * actual static export (web/out) through a minimal test HTMLRewriter adapter
 * (nonce injection). The CSP under test is always read from the middleware
 * response header — the policy literal is never duplicated here.
 *
 * Checks (per engine: chromium + webkit):
 *  1. /chitay document: CSP header has nonce + 'strict-dynamic' + 'wasm-unsafe-eval'
 *     and no bare 'unsafe-eval'; served HTML scripts carry the same nonce.
 *  2. In-page probes (page code, not Playwright eval): JS eval via new Function
 *     must be BLOCKED; WebAssembly.compile must be ALLOWED.
 *  3. Real runtime: dynamic-import of local @mediapipe/tasks-vision
 *     (node_modules vision_bundle.mjs, same package the app bundles),
 *     FilesetResolver over local /mediapipe/wasm, HandLandmarker from local
 *     /models/hand_landmarker.task, detectForVideo on synthetic canvas
 *     .captureStream frames, then close(). No mocked landmarker; blank/synthetic
 *     frames prove invocation only, not hand accuracy. No camera is opened.
 *  4. SPA navigation: /tarot document -> Next Link click to /chitay; same
 *     document (no new /chitay HTML request); probes re-run in the inherited-CSP
 *     document, including the full MediaPipe run.
 *  5. Negative control: same middleware-derived header with 'wasm-unsafe-eval'
 *     removed must BLOCK WebAssembly.compile in-page (with a
 *     securitypolicyviolation event) while eval stays blocked.
 *
 * All non-loopback requests are aborted by a Playwright route guard. The server
 * binds an ephemeral 127.0.0.1 port only and is closed in `finally`. Nonces,
 * header values, cookies and tokens are never printed or written to artifacts.
 *
 * Usage:
 *   node web/scripts/palm-csp-qa.mjs [--engine=chromium|webkit|both] [--out=DIR] [--help]
 *
 * Exit codes: 0 all required checks pass; 1 required check failed; 2 harness error.
 */
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { onRequest } from '../../functions/[[path]].js';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`palm-csp-qa.mjs — production-equivalent CSP + real MediaPipe runtime gate.

Usage: node web/scripts/palm-csp-qa.mjs [--engine=chromium|webkit|both] [--out=DIR]

--engine  Browser engines to run (default: both).
--out     Artifact directory (default: <repo>/qa-report/palm-csp/).

Required checks: middleware-derived CSP (nonce + strict-dynamic + wasm-unsafe-eval,
no unsafe-eval) on /chitay, in-page eval-blocked + wasm-allowed, real local
tasks-vision HandLandmarker detectForVideo + close on synthetic frames, /tarot ->
/chitay Next Link SPA navigation with inherited CSP, negative control without
'wasm-unsafe-eval' blocks WebAssembly. All non-loopback requests are blocked.`);
  process.exit(0);
}
const engineArg = (args.find(a => a.startsWith('--engine')) || '--engine=both').split('=')[1] || 'both';
if (!['chromium', 'webkit', 'both'].includes(engineArg)) {
  console.error(`Unknown --engine "${engineArg}" (use chromium|webkit|both)`);
  process.exit(2);
}
const engines = engineArg === 'both' ? ['chromium', 'webkit'] : [engineArg];
const repo = fileURLToPath(new URL('../..', import.meta.url));
const outDir = path.resolve(
  repo,
  (args.find(a => a.startsWith('--out')) || '').split('=')[1] || 'qa-report/palm-csp/',
);

// ---------------------------------------------------------------------------
// Minimal test HTMLRewriter adapter (Node has no Workers HTMLRewriter).
// Supports exactly the selectors onRequest uses; records + applies the nonce.
// Limitation: attribute values containing ">" are not expected in Next export.
// ---------------------------------------------------------------------------
class TestHTMLRewriter {
  constructor() {
    this.rules = [];
    this.record = { nonces: [], rewritten: 0 }; // nonce values are never printed
  }
  on(selector, handler) {
    this.rules.push({ selector, handler });
    return this;
  }
  transform = response => {
    return (async () => {
      let html = await response.text();
      for (const { selector, handler } of this.rules) {
        const matcher = selector === 'script' ? /<script\b[^>]*>/gi : /<link\b[^>]*?>/gi;
        const predicate = attrPredicate(selector);
        html = html.replace(matcher, tag => {
          const attrs = tag.slice(tag.indexOf('<') + 1, tag.lastIndexOf('>'));
          if (!predicate(attrs)) return tag;
          let updated = tag;
          handler.element({
            setAttribute: (name, value) => {
              if (name.toLowerCase() === 'nonce') {
                this.record.nonces.push(value);
                updated = upsertNonce(tag, value);
              }
            },
          });
          if (updated !== tag) this.record.rewritten++;
          return updated;
        });
      }
      return new Response(html, { status: response.status, headers: response.headers });
    })();
  };
}
function attrPredicate(selector) {
  if (selector === 'script') return () => true;
  const m = selector.match(/\[(\w+)="?([^"\]]+)"?\]$/); // e.g. link[as="script"]
  if (!m) return () => false;
  const attrRe = new RegExp(`(?:^|\\s)${m[1]}\\s*=\\s*"?${m[2]}"?(?:\\s|/|>|$)`, 'i');
  return attrs => attrRe.test(attrs);
}
function upsertNonce(tag, nonce) {
  if (/\snonce\s*=/i.test(tag)) {
    return tag.replace(/(\s)nonce\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>/]+)/i, `$1nonce="${nonce}"`);
  }
  return tag.replace(/^(<[a-zA-Z]+\b)/, `$1 nonce="${nonce}"`);
}
globalThis.HTMLRewriter = TestHTMLRewriter;

// ---------------------------------------------------------------------------
// Static server for web/out with the real middleware applied to HTML documents.
// ---------------------------------------------------------------------------
const root = path.resolve(repo, 'web', 'out');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
};
const docLog = []; // { pathname, dest, purpose } for every middleware-applied HTML document
const lastDoc = {}; // pathname -> { nonceCount, nonceInHeader, headerHasWasmToken } (no values kept)
const scenarioBDiagnostics = {};
const DEBUG = process.env.PALM_QA_DEBUG === '1';

// In-page probe module, served at /qa-harness/probe.mjs (nonce'd by the real
// middleware like any app script). Runs the actual checks as page code.
const probeSource = `
var QA = (window.__palmCspQa = window.__palmCspQa || { runs: {}, violations: [], loadedAt: performance.timeOrigin });
if (!QA.listening) {
  QA.listening = true;
  document.addEventListener('securitypolicyviolation', function (e) {
    QA.violations.push({ directive: e.effectiveDirective || e.violatedDirective || '', tag: (e.target && e.target.tagName) || '' });
  });
}
function baseChecks() {
  var r = { evalBlocked: false, evalErrorName: '', wasmCompile: '', wasmErrorName: '' };
  try { var f = new Function('return 1 + 1'); if (f() !== 2) throw new Error('unexpected'); }
  catch (e) { r.evalBlocked = true; r.evalErrorName = e.name; }
  var bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
  return WebAssembly.compile(bytes).then(
    function () { r.wasmCompile = 'allowed'; return r; },
    function (e) { r.wasmCompile = 'blocked'; r.wasmErrorName = e.name; return r; }
  );
}
function drawSynthetic(ctx, phase) {
  var w = ctx.canvas.width, h = ctx.canvas.height;
  var g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#101418'); g.addColorStop(1, '#2a3140');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(214,196,178,0.92)';
  ctx.beginPath();
  ctx.ellipse(w / 2 + Math.sin(phase) * 14, h / 2, 92, 196, Math.sin(phase * 0.5) * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (var i = 0; i < 40; i++) ctx.fillRect((i * 97 + phase * 13) % w, (i * 53) % h, 3, 3);
}
async function mediapipeRun() {
  var mp = { imported: false, importMs: 0, fileset: false, delegateTried: [], delegateUsed: '',
    createMs: 0, createErrorNames: '', detectCalls: 0, detectOk: 0, landmarksFrames: 0,
    lastShape: '', videoReady: false, videoSetupError: '', input: '', closed: false, fatal: '', totalMs: 0 };
  var t0 = performance.now();
  try {
    var vision = await import('/qa-vendor/vision_bundle.mjs');
    mp.imported = true; mp.importMs = Math.round(performance.now() - t0);
    var fileset = await vision.FilesetResolver.forVisionTasks('/mediapipe/wasm');
    mp.fileset = true;
    var tracker = null;
    var delegates = ['GPU', 'CPU'];
    for (var d = 0; d < delegates.length; d++) {
      var delegate = delegates[d];
      mp.delegateTried.push(delegate);
      var t1 = performance.now();
      try {
        tracker = await vision.HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: '/models/hand_landmarker.task', delegate: delegate },
          runningMode: 'VIDEO', numHands: 1
        });
        mp.delegateUsed = delegate; mp.createMs = Math.round(performance.now() - t1);
        break;
      } catch (e) { tracker = null; mp.createErrorNames += delegate + ':' + e.name + ' '; }
    }
    if (!tracker) throw new Error('HandLandmarker create failed: ' + mp.createErrorNames);
    var canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 480;
    var ctx = canvas.getContext('2d');
    var phase = 0; drawSynthetic(ctx, phase);
    var canRequestFrame = typeof CanvasCaptureMediaStreamTrack !== 'undefined' &&
      typeof CanvasCaptureMediaStreamTrack.prototype.requestFrame === 'function';
    var stream = canvas.captureStream(canRequestFrame ? 0 : 15);
    var track = stream.getVideoTracks()[0];
    function pushFrame() { phase += 0.35; drawSynthetic(ctx, phase); if (canRequestFrame) track.requestFrame(); }
    var video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.setAttribute('playsinline', '');
    video.srcObject = stream;
    // Video pipeline is preferred but must not be fatal: WebKit may never fire
    // loadedmetadata for a captureStream-backed element; the canvas-direct
    // fallback (SDK ImageSource contract) then carries the detect check.
    try {
      await new Promise(function (resolve, reject) {
        var to = setTimeout(function () { reject(new Error('video metadata timeout')); }, 5000);
        video.onloadedmetadata = function () { clearTimeout(to); resolve(); };
        video.onerror = function () { clearTimeout(to); reject(new Error('video element error')); };
      });
      await video.play();
      var kicked = 0;
      mp.videoReady = await new Promise(function (resolve) {
        var started = performance.now();
        var iv = setInterval(function () {
          pushFrame(); kicked++;
          if (video.readyState >= 2 && video.currentTime > 0) { clearInterval(iv); resolve(true); }
          else if (performance.now() - started > 6000) { clearInterval(iv); resolve(false); }
        }, 50);
      });
      mp.videoKicks = kicked;
    } catch (e) {
      mp.videoSetupError = String((e && e.message) || e).slice(0, 80);
      mp.videoReady = false;
    }
    // detectForVideo accepts any ImageSource; prefer the live video pipeline
    // and fall back to driving the generated canvas directly (disclosed).
    var source = mp.videoReady ? video : canvas;
    mp.input = mp.videoReady ? 'video-capturestream' : 'canvas-direct';
    var drawer = setInterval(function () { pushFrame(); }, 66);
    try {
      var tBase = Math.round(performance.now());
      for (var i = 1; i <= 5; i++) {
        mp.detectCalls = i;
        var out = tracker.detectForVideo(source, tBase + i * 100);
        mp.detectOk++;
        var lm = out && out.landmarks;
        if (lm && lm.length > 0) mp.landmarksFrames++;
        mp.lastShape = 'landmarks:' + (lm ? lm.length : 'none');
        await new Promise(function (r) { setTimeout(r, 70); });
      }
    } finally { clearInterval(drawer); }
    tracker.close();
    mp.closed = true;
    return mp;
  } catch (e) {
    mp.fatal = ((e && e.name) ? e.name + ': ' : '') + String((e && e.message) || e).slice(0, 200);
    return mp;
  } finally { mp.totalMs = Math.round(performance.now() - t0); }
}
async function runOnce(tag, withMp) {
  var run = { tag: tag, done: false, base: await baseChecks(), mp: null, error: '' };
  if (withMp) run.mp = await mediapipeRun();
  run.done = true;
  QA.runs[tag] = run;
  return run;
}
QA.run = function (tag, withMp) { return runOnce(tag, !!withMp); };
var mode = new URL(import.meta.url).searchParams.get('mode') || 'quick';
if (mode === 'full') {
  runOnce('direct-full', true);
} else if (mode === 'negative') {
  runOnce('negative', false);
} else {
  runOnce('direct-quick', false);
  // SPA navigation: re-run the full probes from PAGE CODE once the router
  // changes the path — never triggered via a privileged Playwright evaluate,
  // so CSP still governs every check in the spa-full run.
  var entryPath = location.pathname;
  var spaWatch = setInterval(function () {
    if (location.pathname !== entryPath && location.pathname.indexOf('/chitay') === 0 && !QA.runs['spa-full']) {
      clearInterval(spaWatch);
      setTimeout(function () { runOnce('spa-full', true); }, 300);
    }
  }, 150);
}
`;

const NEGATIVE_HTML =
  '<!doctype html><html lang="vi"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>QA negative control</title></head><body>' +
  '<div id="qa-negative">Control document: same middleware CSP without wasm-unsafe-eval.</div>' +
  '<script type="module" src="/qa-harness/probe.mjs?mode=negative"></script></body></html>';

async function applyMiddleware(pathname, html) {
  const res = await onRequest({
    request: new Request(`http://127.0.0.1${pathname}`),
    env: {
      ASSETS: {
        fetch: async () =>
          new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }),
      },
    },
  });
  return res;
}
async function serveDocument(res, pathname, rawHtml, { stripWasmToken = false, request } = {}) {
  // Per-response record: the middleware instantiates the class itself
  // (`new HTMLRewriter()`), so bind the record via a per-response subclass.
  const record = { nonces: [], rewritten: 0 };
  const BoundRewriter = class extends TestHTMLRewriter {
    constructor() {
      super();
      this.record = record;
    }
  };
  const previous = globalThis.HTMLRewriter;
  globalThis.HTMLRewriter = BoundRewriter;
  let out;
  try {
    out = await applyMiddleware(pathname, rawHtml);
  } finally {
    globalThis.HTMLRewriter = previous;
  }
  let csp = out.headers.get('content-security-policy') || '';
  if (stripWasmToken) {
    // Negative control: derive the variant by removing the token from the
    // actual middleware header — the policy literal is never duplicated.
    csp = csp.replace(/\s*'wasm-unsafe-eval'/g, '');
  }
  lastDoc[pathname] = {
    nonceCount: record.nonces.length,
    rewritten: record.rewritten,
    nonceInHeader: /\bnonce-[A-Za-z0-9+/=]+/.test(csp),
    headerHasWasmToken: csp.includes("'wasm-unsafe-eval'"),
    headerHasStrictDynamic: csp.includes("'strict-dynamic'"),
  };
  docLog.push({
    pathname,
    dest: request?.headers?.['sec-fetch-dest'] || 'unknown',
    purpose: request?.headers?.['sec-purpose'] || '',
  });
  const body = await out.text();
  for (const [k, v] of out.headers) {
    if (k.toLowerCase() === 'content-length') continue;
    res.setHeader(k, k.toLowerCase() === 'content-security-policy' && stripWasmToken ? csp : v);
  }
  res.writeHead(out.status);
  res.end(body);
}
async function resolveStatic(pathname, search) {
  let file = path.resolve(root, '.' + decodeURIComponent(pathname));
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  const st = await stat(file).catch(() => null);
  if (!path.extname(file)) {
    // RSC prefetch/navigation requests want the .txt payload, not HTML.
    if (search.includes('_rsc')) {
      const txt = await stat(file + '.txt').catch(() => null);
      if (txt?.isFile()) return file + '.txt';
    }
    const html = await stat(file + '.html').catch(() => null);
    if (html?.isFile()) return file + '.html';
  }
  if (st?.isDirectory()) file = path.join(file, 'index.html');
  else if (!path.extname(file)) {
    const plain = await stat(file + '.txt').catch(() => null);
    if (plain?.isFile()) return file + '.txt';
  }
  return file;
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1`);
    const pathname = decodeURIComponent(url.pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    if (pathname === '/qa-harness/probe.mjs') {
      res.setHeader('content-type', 'text/javascript; charset=utf-8');
      res.writeHead(200).end(probeSource);
      return;
    }
    if (pathname === '/qa-vendor/vision_bundle.mjs') {
      // Real @mediapipe/tasks-vision ESM entry, the same local package the app
      // bundles — served over loopback so no external origin is contacted.
      const bundle = await readFile(
        path.resolve(repo, 'web', 'node_modules', '@mediapipe', 'tasks-vision', 'vision_bundle.mjs'),
      );
      res.setHeader('content-type', 'text/javascript; charset=utf-8');
      res.writeHead(200).end(bundle);
      return;
    }
    if (pathname === '/qa-harness/negative') {
      await serveDocument(res, pathname, NEGATIVE_HTML, { stripWasmToken: true, request: req });
      return;
    }
    const file = await resolveStatic(url.pathname, url.search);
    if (!file) {
      res.writeHead(403).end();
      return;
    }
    let body;
    try {
      body = await readFile(file);
    } catch {
      res.writeHead(404).end();
      return;
    }
    const type = mime[path.extname(file)] || 'application/octet-stream';
    if (type.startsWith('text/html')) {
      // Inject the QA probe before the real middleware so the production
      // pipeline nonces it together with the app's own scripts.
      const probe = `<script type="module" src="/qa-harness/probe.mjs?mode=${pathname.startsWith('/chitay') ? 'full' : 'quick'}"></script>`;
      const raw = body.toString('utf8').replace(/<\/body>/i, `${probe}</body>`);
      await serveDocument(res, pathname === '/index.html' ? '/' : pathname.replace(/\.html$/, ''), raw, { request: req });
      return;
    }
    res.setHeader('content-type', type);
    res.writeHead(200).end(body);
  } catch (err) {
    console.error(`[palm-csp-qa] server error on ${req.url}:`, String(err && err.stack ? err.stack.split('\n').slice(0, 4).join(' | ') : err).slice(0, 400));
    if (!res.headersSent) res.writeHead(500);
    res.end(String(err && err.message ? err.message : err).slice(0, 200));
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

// ---------------------------------------------------------------------------
// Playwright scenarios
// ---------------------------------------------------------------------------
await mkdir(outDir, { recursive: true });
const checks = [];
const blockedExternal = [];
const engineVariants = {};
const addCheck = (engine, id, required, pass, detail) => {
  checks.push({ engine, id, required, pass: !!pass, detail: String(detail).slice(0, 220) });
};
const summaryLine = id => checks.filter(c => c.id === id).map(c => `${c.engine}:${c.pass ? 'pass' : 'fail'}`).join(' ');

const CSP_HEADER_ID = 'R1-csp-header-derived';
const NONCE_ID = 'R2-nonce-injected-in-html';
const EVAL_ID = 'R3-eval-blocked-in-page';
const WASM_ID = 'R4-wasm-compile-allowed-in-page';
const MP_ID = 'R5-real-handlandmarker-detect-close';
const SPA_ID = 'R6-spa-nav-inherited-csp';
const NEG_ID = 'R7-negative-no-wasm-token-blocks-wasm';

for (const engineName of engines) {
  const engineImpl = engineName === 'chromium' ? chromium : webkit;
  let browser;
  let variant = engineName;
  try {
    if (engineName === 'chromium') {
      // Prefer the full chromium build (new headless): its compositor produces
      // canvas.captureStream frames, which the old headless shell may not.
      try {
        browser = await chromium.launch({ headless: true, channel: 'chromium' });
        variant = 'chromium-full(new-headless)';
      } catch {
        browser = await chromium.launch({ headless: true });
        variant = 'chromium-headless-shell';
        console.log('[chromium] full build unavailable; fell back to headless shell (recorded in summary)');
      }
    } else {
      browser = await engineImpl.launch({ headless: true });
    }
  } catch (err) {
    addCheck(engineName, 'engine-launch', true, false, `launch failed: ${err.message}`);
    continue;
  }
  const tEngine = Date.now();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const h = url.hostname;
        const loopback = h === '127.0.0.1' || h === 'localhost' || h === '::1' || h === '[::1]';
        if (!loopback) {
          blockedExternal.push(`${url.host} ${route.request().resourceType()}`);
          return route.abort('blockedbyclient');
        }
      }
      return route.continue();
    });
    const pageErrors = [];

    // --- Scenario A: direct document /chitay --------------------------------
    {
      const page = await context.newPage();
      page.setDefaultTimeout(90_000);
      page.on('pageerror', e => pageErrors.push(String(e.message).slice(0, 200)));
      const t0 = Date.now();
      const resp = await page.goto(`${base}/chitay`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      const csp = resp.headers()['content-security-policy'] || '';
      addCheck(engineName, CSP_HEADER_ID, true,
        !!csp && csp.includes("'nonce-") && csp.includes("'strict-dynamic'") && csp.includes("'wasm-unsafe-eval'") && !csp.includes("'unsafe-eval'"),
        `header from onRequest: nonce+strict-dynamic+wasm-unsafe-eval=${csp.includes("'wasm-unsafe-eval'")}, bare-unsafe-eval absent=${!csp.includes("'unsafe-eval'")}`);
      const meta = lastDoc['/chitay'];
      addCheck(engineName, NONCE_ID, true,
        !!meta && meta.nonceCount >= 2 && meta.nonceInHeader && meta.rewritten >= meta.nonceCount,
        `middleware adapter nonced ${meta ? meta.nonceCount : 0} script tags, header nonce present=${!!meta && meta.nonceInHeader}`);

      await page.waitForFunction(
        () => window.__palmCspQa && window.__palmCspQa.runs['direct-full'] && window.__palmCspQa.runs['direct-full'].done,
        undefined, { timeout: 90_000 },
      );
      const run = await page.evaluate(() => window.__palmCspQa.runs['direct-full']);
      addCheck(engineName, EVAL_ID, true, run.base.evalBlocked === true,
        `in-page new Function blocked=${run.base.evalBlocked} (${run.base.evalErrorName || 'no throw'})`);
      addCheck(engineName, WASM_ID, true, run.base.wasmCompile === 'allowed',
        `in-page WebAssembly.compile=${run.base.wasmCompile}${run.base.wasmErrorName ? ' (' + run.base.wasmErrorName + ')' : ''}`);
      const mp = run.mp || {};
      const mpOk = !!(mp.imported && mp.fileset && mp.delegateUsed && mp.detectCalls === 5 && mp.detectOk === 5 && mp.closed && !mp.fatal);
      addCheck(engineName, MP_ID, true, mpOk,
        mpOk
          ? `real tasks-vision: delegate=${mp.delegateUsed}, create ${mp.createMs}ms, detectForVideo ${mp.detectOk}/${mp.detectCalls} frames ok on input=${mp.input} (${mp.landmarksFrames} with landmarks — synthetic frame, accuracy not asserted), closed=${mp.closed}`
          : `mediapipe failure: ${mp.fatal || 'incomplete'} [imported=${mp.imported} fileset=${mp.fileset} tried=${(mp.delegateTried || []).join('+')}]`);
      await page.screenshot({ path: path.join(outDir, `chitay-${engineName}.png`), fullPage: false });
      if (pageErrors.length) {
        addCheck(engineName, 'info-chitay-pageerrors', false, false, `observed ${pageErrors.length} page error(s): ${pageErrors[0]}`);
      }
      console.log(`[${engineName}] direct /chitay done in ${Date.now() - t0}ms`);
    }

    // --- Scenario B: /tarot document -> Next Link SPA nav to /chitay --------
    {
      const page = await context.newPage();
      page.setDefaultTimeout(90_000);
      page.on('pageerror', e => pageErrors.push(String(e.message).slice(0, 200)));
      // Navigational = real top-level document; browser prerender/prefetch
      // fetches (sec-purpose) are background optimizations, not reloads.
      const navDocs = () => docLog.filter(d => d.pathname === '/chitay' && d.dest === 'document' && d.purpose !== 'prefetch').length;
      const chitayNavDocsBefore = navDocs();
      const t0 = Date.now();
      await page.goto(`${base}/tarot`, { waitUntil: 'networkidle', timeout: 45_000 });
      await page.waitForTimeout(500); // let hydration settle before Link click
      await page.waitForFunction(
        () => window.__palmCspQa && window.__palmCspQa.runs['direct-quick'] && window.__palmCspQa.runs['direct-quick'].done,
        undefined, { timeout: 30_000 },
      );
      const quick = await page.evaluate(() => window.__palmCspQa.runs['direct-quick']);
      const quickOk = quick.base.evalBlocked === true && quick.base.wasmCompile === 'allowed';
      const loadedAtBefore = await page.evaluate(() => window.__palmCspQa.loadedAt);

      const link = page.locator('a[href="/chitay"]').first();
      try {
        await link.click({ timeout: 5_000 });
      } catch {
        await link.dispatchEvent('click'); // hidden/tiled element: React onClick still fires
      }
      await page.waitForURL(/\/chitay\/?(\?|$)/, { timeout: 30_000 });
      // The probe itself (page code, CSP-governed) watches the router path and
      // runs the full spa-full checks — no privileged Playwright trigger.
      await page.waitForFunction(
        () => window.__palmCspQa && window.__palmCspQa.runs['spa-full'] && window.__palmCspQa.runs['spa-full'].done,
        undefined, { timeout: 90_000 },
      );
      const spa = await page.evaluate(() => window.__palmCspQa.runs['spa-full']);
      const diag = await page.evaluate(() => ({
        url: location.pathname,
        loadedAt: window.__palmCspQa.loadedAt,
        runs: Object.keys(window.__palmCspQa.runs),
        nav: performance.getEntriesByType('navigation').map(e => ({
          name: e.name.replace(location.origin, ''),
          type: e.type,
          activationStart: e.activationStart,
        })),
      }));
      const loadedAtAfter = diag.loadedAt;
      const chitayNavDocsAfter = navDocs();
      const sameDocument = loadedAtBefore === loadedAtAfter;
      const activated = (diag.nav || []).some(e => e.activationStart > 0);
      const noNewNavigationalDocument = chitayNavDocsAfter === chitayNavDocsBefore;
      const mp = spa.mp || {};
      const mpOk = !!(mp.imported && mp.fileset && mp.delegateUsed && mp.detectCalls === 5 && mp.detectOk === 5 && mp.closed && !mp.fatal);
      const spaOk = noNewNavigationalDocument && quickOk && spa.base.evalBlocked && spa.base.wasmCompile === 'allowed' && mpOk;
      addCheck(engineName, SPA_ID, true, spaOk,
        `/tarot -> /chitay via Next Link (${sameDocument ? 'same document' : activated ? 'prerender activation' : 'FRESH DOCUMENT'}): no navigational /chitay reload=${noNewNavigationalDocument}, evalBlocked=${spa.base.evalBlocked} (page-triggered), wasm=${spa.base.wasmCompile}, mediapipe=${mpOk ? 'ok input=' + mp.input + ' delegate=' + mp.delegateUsed : 'FAILED ' + (mp.fatal || 'incomplete')} (entry quick probes ${quickOk ? 'ok' : 'FAILED'}; total ${Date.now() - t0}ms)`);
      scenarioBDiagnostics[engineName] = diag;
      if (DEBUG) console.log(`[${engineName}] docLog:`, JSON.stringify(docLog), 'diag:', JSON.stringify(diag));
    }

    // --- Scenario C: negative control (derived header minus wasm token) -----
    {
      const page = await context.newPage();
      page.setDefaultTimeout(60_000);
      const t0 = Date.now();
      const resp = await page.goto(`${base}/qa-harness/negative`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      const csp = resp.headers()['content-security-policy'] || '';
      await page.waitForFunction(
        () => window.__palmCspQa && window.__palmCspQa.runs['negative'] && window.__palmCspQa.runs['negative'].done,
        undefined, { timeout: 30_000 },
      );
      const neg = await page.evaluate(() => ({
        run: window.__palmCspQa.runs['negative'],
        violations: window.__palmCspQa.violations,
      }));
      const headerDerived = !!csp && csp.includes("'strict-dynamic'") && !csp.includes("'wasm-unsafe-eval'");
      const violated = neg.violations.some(v => /script/i.test(v.directive));
      const negOk = headerDerived && neg.run.base.wasmCompile === 'blocked' && neg.run.base.evalBlocked === true && violated;
      addCheck(engineName, NEG_ID, true, negOk,
        `same middleware policy minus 'wasm-unsafe-eval': WebAssembly.compile=${neg.run.base.wasmCompile} (${neg.run.base.wasmErrorName || 'no error'}), evalBlocked=${neg.run.base.evalBlocked}, violation event=${violated}, header derived=${headerDerived} (${Date.now() - t0}ms)`);
    }

    await context.close();
    console.log(`[${engineName}] engine total ${Date.now() - tEngine}ms, browser ${browser.version()}`);
  } catch (err) {
    addCheck(engineName, 'engine-scenario-error', true, false, `${err.message || err}`);
  } finally {
    engineVariants[engineName] = variant;
    await browser.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Summary + artifacts (never includes nonce/header/token values)
// ---------------------------------------------------------------------------
const required = checks.filter(c => c.required);
const failed = required.filter(c => !c.pass);
const passedCount = required.length - failed.length;
const blockedByHost = {};
for (const entry of blockedExternal) {
  const host = entry.split(' ')[0];
  blockedByHost[host] = (blockedByHost[host] || 0) + 1;
}
const result = {
  date: new Date().toISOString(),
  base: base.replace(/:\d+$/, ':<ephemeral>'),
  engines,
  requiredTotal: required.length,
  requiredPassed: passedCount,
  requiredFailed: failed.length,
  checks,
  externalRequestsBlocked: { total: blockedExternal.length, byHost: blockedByHost },
  htmlDocumentsServed: docLog.length,
  documentRequests: docLog,
  scenarioB: scenarioBDiagnostics,
  engineVariants: engineVariants,
  artifacts: outDir,
  boundaries: {
    csp: 'real onRequest middleware via minimal test HTMLRewriter adapter; policy never duplicated in this script',
    runtime: 'real @mediapipe/tasks-vision 0.10.35 from local node_modules + local /mediapipe/wasm + local /models/hand_landmarker.task; no mocked landmarker',
    frames: 'synthetic canvas.captureStream frames; no camera; landmark counts prove invocation only, not accuracy',
    navigation: 'static export web/out; /tarot -> /chitay via actual Next Link client navigation',
  },
};
await writeFileSafe(path.join(outDir, 'summary.json'), JSON.stringify(result, null, 2) + '\n');

console.log('\n=== palm-csp-qa summary ===');
for (const c of checks) console.log(`${c.required ? '[required]' : '[info]    '} ${c.engine} ${c.id}: ${c.pass ? 'PASS' : 'FAIL'} — ${c.detail}`);
console.log(`required: ${passedCount}/${required.length} passed`);
console.log(`external requests blocked: ${blockedExternal.length} (${JSON.stringify(blockedByHost)})`);
console.log(`artifacts: ${outDir}`);

async function writeFileSafe(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await import('node:fs/promises').then(m => m.writeFile(file, data));
}

process.exitCode = failed.length ? 1 : 0;
await new Promise(resolve => server.close(resolve));
if (failed.length) {
  console.log('FAIL: required CSP/runtime checks failed — see details above.');
} else {
  console.log(`PASS: middleware-derived CSP enforced (eval blocked, wasm gated by wasm-unsafe-eval), real HandLandmarker detectForVideo+close ok on ${summaryLine(MP_ID)}, SPA-inherited CSP ok on ${summaryLine(SPA_ID)}, negative control ok on ${summaryLine(NEG_ID)}.`);
}
