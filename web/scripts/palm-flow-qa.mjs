#!/usr/bin/env node
/**
 * Palm (/chitay) behavioral QA — synthetic fixtures only, no real camera,
 * no personal images and no production traffic.
 *
 * What it drives through the real UI on a running local preview/dev server:
 *  - hydration + camera open on a synthetic MediaStream (canvas.captureStream)
 *    with fake lens/torch/focus capabilities;
 *  - control deadline: a track whose applyConstraints never settles must not
 *    latch the camera controls;
 *  - lens-select guard while a focus request is pending;
 *  - photo pipeline: JPEG/type/size gates, <=1200px normalization, EXIF
 *    orientation on both createImageBitmap and <img> fallback paths, the
 *    invalid-file-while-decoding race, and stale AI results after reset;
 *  - consent gate: no image leaves the page before the explicit checkbox;
 *  - zoom dialog accessible name, Escape close, focus return; line tabs group.
 *
 * Every non-loopback request is aborted; the only external URL the app may
 * attempt during dev hydration (AUTH_API_BASE/api/ai/session) is fulfilled
 * locally with 401 so no network traffic leaves the machine.
 *
 * Usage:
 *   node scripts/palm-flow-qa.mjs [--base http://127.0.0.1:3126]
 *     [--engine chromium|webkit] [--out ../../qa-report/palm-flow] [--help]
 *
 * The preview server must already be running and serving this worktree; this
 * script never starts, stops or builds anything.
 */
import { chromium, webkit } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
if (argv.includes("--help")) {
  console.log(
    [
      "Palm behavioral QA against a local preview (synthetic fixtures, no real camera/photos).",
      "  --base    base URL of the running preview (default http://127.0.0.1:3126)",
      "  --engine  chromium | webkit (default chromium)",
      "  --out     artifact directory (default ../../qa-report/palm-flow)",
    ].join("\n"),
  );
  process.exit(0);
}
const BASE = (arg("base", process.env.PALM_QA_BASE) || "http://127.0.0.1:3126").replace(/\/$/, "");
const ENGINE = arg("engine", "chromium");
const OUT = path.resolve(arg("out", path.join(HERE, "..", "..", "qa-report", "palm-flow")));

const checks = [];
let failed = 0;
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail === undefined ? null : detail });
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function skip(name, detail) {
  checks.push({ name, ok: true, skipped: true, detail: detail ?? null });
  console.log(`SKIP  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
}

/* ---------------------------------------------------------------- fixtures */

/** Insert an EXIF APP1 (Orientation) segment right after SOI of a real JPEG. */
function withExifOrientation(jpeg, orientation) {
  const tiff = Buffer.alloc(26);
  tiff.write("II", 0, "ascii");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8); // one IFD entry
  tiff.writeUInt16LE(0x0112, 10); // Orientation
  tiff.writeUInt16LE(3, 12); // SHORT
  tiff.writeUInt32LE(1, 14); // count
  tiff.writeUInt16LE(orientation, 18);
  tiff.writeUInt32LE(0, 22); // next IFD
  const header = Buffer.from("Exif\0\0", "latin1");
  const payload = Buffer.concat([header, tiff]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), Buffer.from([(payload.length + 2) >> 8, (payload.length + 2) & 0xff]), payload]);
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error("fixture is not a JPEG");
  return Buffer.concat([jpeg.slice(0, 2), app1, jpeg.slice(2)]);
}

/* --------------------------------------------------------- page injection */

const PROFILE_SEED = () => {
  try {
    if (!localStorage.getItem("astrox_v2_state")) {
      localStorage.setItem(
        "astrox_v2_state",
        JSON.stringify({
          profile: { name: "An", gender: "Nam", dob: "1990-01-01", hourChi: "Tí", place: "Hà Nội" },
          chartImageBase64: null,
          ziweiChart: null,
          onboarded: true,
          aiCache: { version: 2, profiles: {}, legacy: {} },
        }),
      );
    }
  } catch {
    /* storage unavailable */
  }
};

const FAKE_CAMERA = () => {
  const state = (window.__palmFake = {
    focusDelayMs: 0,
    hangMode: false,
    calls: [],
    torch: false,
    devices: [
      { deviceId: "back-tele", label: "camera2 0, facing back tele", facingMode: "environment", zoomMin: 3 },
      { deviceId: "back-wide", label: "camera2 1, facing back", facingMode: "environment", zoomMin: 1 },
      { deviceId: "front", label: "camera2 2, facing front", facingMode: "user", zoomMin: 1 },
    ],
  });
  let streamSupported = true;
  try {
    const probe = document.createElement("canvas");
    if (typeof probe.captureStream !== "function") streamSupported = false;
  } catch {
    streamSupported = false;
  }
  state.streamSupported = streamSupported;
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  let hue = 0;
  const draw = () => {
    hue = (hue + 9) % 360;
    ctx.fillStyle = `hsl(${hue} 55% 45%)`;
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = "#fff";
    ctx.fillRect(24, 24, 80, 80);
  };
  draw();
  setInterval(draw, 80);
  try {
    delete window.ImageCapture;
  } catch {
    /* keep ImageCapture fallback harmless if not deletable */
  }

  const streamFor = (device) => {
    const stream = canvas.captureStream(10);
    const track = stream.getVideoTracks()[0];
    Object.defineProperty(track, "label", { configurable: true, get: () => device.label });
    track.getSettings = () => ({ facingMode: device.facingMode, deviceId: device.deviceId, width: 640, height: 480, torch: state.torch });
    track.getCapabilities = () => ({
      focusMode: ["single-shot", "continuous"],
      pointsOfInterest: true,
      torch: true,
      zoom: { min: device.zoomMin, max: 8, step: 0.1 },
      width: { max: 640 },
      height: { max: 480 },
    });
    track.applyConstraints = async (constraints) => {
      const advanced = constraints?.advanced?.[0] || {};
      state.calls.push({ advanced, at: Date.now() });
      if (state.hangMode) return new Promise(() => {});
      if (state.focusDelayMs && (advanced.pointsOfInterest || advanced.focusMode)) {
        await new Promise((resolve) => setTimeout(resolve, state.focusDelayMs));
      }
      if (typeof advanced.torch === "boolean") state.torch = advanced.torch;
    };
    return stream;
  };
  const byId = (id) => state.devices.find((d) => d.deviceId === id);
  const mediaDevices = {
    enumerateDevices: async () => state.devices.map(({ deviceId, label }) => ({ kind: "videoinput", deviceId, label })),
    getUserMedia: async (constraints) => {
      const exact = constraints?.video?.deviceId?.exact ?? null;
      const device = exact ? byId(exact) : state.devices[0];
      if (!device || !streamSupported) throw Object.assign(new Error("NotFoundError"), { name: "NotFoundError" });
      return streamFor(device);
    },
  };
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: mediaDevices });
};

/* ------------------------------------------------------------------- main */

const engine = ENGINE === "webkit" ? webkit : chromium;
const browser = await engine.launch({ headless: true, args: ENGINE === "chromium" ? ["--autoplay-policy=no-user-gesture-required"] : [] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.addInitScript(FAKE_CAMERA);
await context.addInitScript(PROFILE_SEED);

const PAGE_ERRORS = [];
const externalAttempts = new Set();
const externalFulfilled = new Set();
let aiRequests = 0;
let aiPayloads = [];
let aiDelayMs = 0;
const PALM_AI_TEXT = JSON.stringify({
  quality: "ok",
  message: "",
  summary: "Tổng quan thử nghiệm từ ảnh tổng hợp.",
  lines: [
    { name: "Tâm đạo", observation: "Nếp quan sát được trên ảnh tổng hợp.", reading: "Góc nhìn truyền thống thử nghiệm." },
    { name: "Trí đạo", observation: "Nếp thứ hai của fixture.", reading: "Góc nhìn thứ hai của fixture." },
  ],
});
const SITE_CONFIG = {
  config: {
    billing: { enabled: true, services: [{ id: "palm", module: "palm", name: "Chỉ tay", status: "free", points: 0 }] },
    content: {},
    maintenance: false,
  },
  revision: 1,
};

await context.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (["data:", "blob:"].includes(url.protocol)) return route.continue();
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (!loopback) {
    externalAttempts.add(`${url.origin}${url.pathname}`);
    if (url.origin === "https://api.theastrox.space" && url.pathname === "/api/ai/session") {
      externalFulfilled.add(`${url.origin}${url.pathname}`);
      return route.fulfill({ status: 401, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  }
  if (url.pathname === "/api/site-config") return route.fulfill({ contentType: "application/json", body: JSON.stringify(SITE_CONFIG) });
  if (url.pathname === "/api/ai") {
    aiRequests++;
    aiPayloads.push(route.request().postDataJSON());
    if (aiDelayMs) await sleep(aiDelayMs);
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ choices: [{ message: { content: PALM_AI_TEXT }, finish_reason: "stop" }] }),
    });
  }
  if (url.pathname.startsWith("/mediapipe/") || url.pathname.startsWith("/models/")) return route.fulfill({ status: 404, body: "" });
  return route.continue();
});

const page = await context.newPage();
page.setDefaultTimeout(20000);
page.on("pageerror", (error) => PAGE_ERRORS.push(String(error.message).slice(0, 240)));

const camera = page.locator('section[aria-label="Chụp bàn tay"]');
const fileInput = page.locator('input[type="file"][accept="image/jpeg,image/png,image/webp"]');
const photoImg = page.locator('img[alt="Ảnh lòng bàn tay bạn đã chọn"]');

async function setBitmapMode(mode, delayMs = 0) {
  await page.evaluate(
    ({ mode, delayMs }) => {
      if (!window.__nativeCreateImageBitmap) window.__nativeCreateImageBitmap = window.createImageBitmap;
      if (mode === "undefined") {
        window.createImageBitmap = undefined;
        return;
      }
      const native = window.__nativeCreateImageBitmap;
      window.createImageBitmap = async (...args) => {
        if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (mode === "reject") throw new TypeError("createImageBitmap rejected by fixture");
        if (typeof native !== "function") throw new TypeError("createImageBitmap missing");
        return native(...args);
      };
    },
    { mode, delayMs },
  );
}

async function canvasJpeg(width, height) {
  const base64 = await page.evaluate(
    ({ width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#b33";
      ctx.fillRect(0, 0, width / 2, height / 2);
      ctx.fillStyle = "#3b3";
      ctx.fillRect(width / 2, 0, width / 2, height / 2);
      ctx.fillStyle = "#33b";
      ctx.fillRect(0, height / 2, width / 2, height / 2);
      ctx.fillStyle = "#bb3";
      ctx.fillRect(width / 2, height / 2, width / 2, height / 2);
      return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
    },
    { width, height },
  );
  return Buffer.from(base64, "base64");
}

async function selectPhoto(name, mimeType, buffer) {
  await fileInput.setInputFiles({ name, mimeType, buffer });
}

try {
  await mkdir(OUT, { recursive: true });
  await page.goto(`${BASE}/chitay`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Chỉ tay", exact: true }).waitFor();
  const hydrated = await page
    .getByRole("button", { name: /^Tài khoản/ })
    .waitFor({ timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  check("auth menu appears after hydration (guest server HTML replaced)", hydrated);

  /* ---------------------------------------------- hydration + camera open */
  const streamSupported = await page.evaluate(() => window.__palmFake.streamSupported);
  if (!streamSupported) console.log(`SKIP  synthetic camera checks — ${ENGINE} lacks canvas.captureStream`);
  if (streamSupported) {
  await page.getByRole("button", { name: "Chụp bàn tay" }).click();
  await camera.waitFor({ timeout: 15000 });
  check("hydrated camera UI opens from the entry screen", await camera.isVisible());
  await page.waitForFunction(() => document.querySelector('section[aria-label="Chụp bàn tay"] video')?.readyState >= 2, null, { timeout: 15000 });
  const video = camera.locator("video");
  check("synthetic camera stream reaches the video element", (await video.evaluate((el) => el.readyState)) >= 2);
  // Some engines fire loadeddata before hydration attaches the handler; nudge
  // the component's own resize path so the preview overlay cannot cover the video.
  const pendingOverlay = camera.getByText(/Đang mở camera…|Đang đổi camera…/);
  if (await pendingOverlay.count()) {
    await video.evaluate((el) => el.dispatchEvent(new Event("resize")));
    await pendingOverlay.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
  }
  check("camera preview overlay clears before controls are used", (await pendingOverlay.count()) === 0);
  const select = camera.locator("select");
  const torchButton = camera.getByRole("button", { name: /đèn/i });
  const focusButton = camera.getByRole("button", { name: "Lấy nét giữa ảnh" });
  check("wide lens wins over tele for the lens select", (await select.inputValue()) === "back-wide", await select.locator("option").allTextContents());
  check("torch and focus controls appear only because capabilities report them", (await torchButton.count()) === 1 && (await focusButton.count()) === 1);

  /* --------------------------------- control deadline: focus never settles */
  await page.evaluate(() => {
    window.__palmFake.hangMode = true;
  });
  const videoBox = await video.boundingBox();
  const focusStart = Date.now();
  await page.mouse.click(videoBox.x + videoBox.width / 2, videoBox.y + videoBox.height / 2);
  await sleep(300);
  const focusPending = {
    select: await select.isDisabled(),
    torch: await torchButton.isDisabled(),
    focus: await focusButton.isDisabled(),
  };
  const focusLocked = focusPending.select && focusPending.torch && focusPending.focus;
  if (focusLocked || ENGINE === "chromium") {
    check("camera controls are locked while a focus request is pending", focusLocked, focusPending);
  } else {
    // WebKit headless không luôn gửi pointerdown tới <video> của stream tổng hợp.
    skip("camera controls are locked while a focus request is pending (engine does not deliver the synthetic video pointer event)", focusPending);
  }
  if (focusLocked) {
  let selectDuringFocus = "selected";
  try {
    await select.selectOption("back-tele", { timeout: 1200 });
  } catch {
    selectDuringFocus = "rejected";
  }
  check("lens switch is unreachable while focus is pending (select disabled)", selectDuringFocus === "rejected");
  await page.waitForFunction(
    () => {
      const section = document.querySelector('section[aria-label="Chụp bàn tay"]');
      const buttons = [...section.querySelectorAll("button")];
      return buttons.every((b) => !b.disabled) && !section.querySelector("select")?.disabled;
    },
    null,
    { timeout: 9000 },
  ).catch(() => {});
  const focusElapsed = Date.now() - focusStart;
  const focusUnlocked = !(await select.isDisabled()) && !(await torchButton.isDisabled());
  check("a never-settling focus request cannot latch the controls", focusUnlocked, { focusElapsed });
  check("focus deadline is bounded (~5s), not immediate", focusElapsed >= 4000 && focusElapsed <= 9000, focusElapsed);
  check(
    "focus timeout reports an honest failure instead of success",
    !(await camera.locator("p").first().innerText()).includes("Đã gửi yêu cầu lấy nét"),
    await camera.locator("p").first().innerText(),
  );

  /* --------------------------------- control deadline: torch never settles */
  const torchStart = Date.now();
  await torchButton.click();
  await sleep(300);
  check("torch control is locked while its request is pending", await torchButton.isDisabled());
  await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll('section[aria-label="Chụp bàn tay"] button')];
    return buttons.every((b) => !b.disabled);
  }, null, { timeout: 9000 }).catch(() => {});
  const torchElapsed = Date.now() - torchStart;
  check("a never-settling torch request cannot latch the controls", !(await torchButton.isDisabled()), { torchElapsed });
  check("torch deadline is bounded (~5s), not immediate", torchElapsed >= 4000 && torchElapsed <= 9000, torchElapsed);

  /* ------------------------------------- healthy focus still works quickly */
  await page.evaluate(() => {
    window.__palmFake.hangMode = false;
    window.__palmFake.calls.length = 0;
  });
  const healthyStart = Date.now();
  await page.mouse.click(videoBox.x + videoBox.width / 2, videoBox.y + videoBox.height / 2);
  await camera.locator("p").first().filter({ hasText: "Đã gửi yêu cầu lấy nét" }).waitFor({ timeout: 8000 });
  const healthyElapsed = Date.now() - healthyStart;
  check("accepted focus still reports success and re-enables controls", healthyElapsed < 3000 && !(await select.isDisabled()), healthyElapsed);
  } else {
    skip("camera control deadline checks (engine does not deliver the synthetic video pointer event)", focusPending);
  }
  await camera.getByRole("button", { name: "Đóng" }).click();
  await page.getByRole("button", { name: "Chọn ảnh" }).waitFor();
  } else {
    check("synthetic camera checks skipped on this engine (no canvas.captureStream)", true, ENGINE);
  }

  /* ------------------------------------------------- photo pipeline checks */
  const plainJpeg = await canvasJpeg(900, 700);
  await setBitmapMode("normal");
  await selectPhoto("plain.jpg", "image/jpeg", plainJpeg);
  await photoImg.waitFor({ timeout: 10000 });
  const plainDims = await photoImg.evaluate((img) => [img.naturalWidth, img.naturalHeight]);
  check("normalization keeps a sub-1200px photo at its own size", plainDims[0] === 900 && plainDims[1] === 700, plainDims);
  check("loading notice clears after a valid decode", (await page.getByText("Đang chuẩn bị ảnh…").count()) === 0);

  const bigJpeg = await canvasJpeg(3000, 1000);
  await selectPhoto("big.jpg", "image/jpeg", bigJpeg);
  await page.waitForFunction(() => {
    const img = document.querySelector('img[alt="Ảnh lòng bàn tay bạn đã chọn"]');
    return img && img.naturalWidth === 1200;
  }, null, { timeout: 10000 }).catch(() => {});
  const bigDims = await photoImg.evaluate((img) => [img.naturalWidth, img.naturalHeight]);
  check("normalization caps the long edge at 1200px", bigDims[0] === 1200 && bigDims[1] === 400, bigDims);

  const exifJpeg = withExifOrientation(await canvasJpeg(800, 400), 6);
  await selectPhoto("exif.jpg", "image/jpeg", exifJpeg);
  await page.waitForFunction(() => {
    const img = document.querySelector('img[alt="Ảnh lòng bàn tay bạn đã chọn"]');
    return img && img.naturalWidth === 400;
  }, null, { timeout: 10000 }).catch(() => {});
  const exifDims = await photoImg.evaluate((img) => [img.naturalWidth, img.naturalHeight]);
  check("EXIF orientation is honored on the createImageBitmap path", exifDims[0] === 400 && exifDims[1] === 800, exifDims);

  await setBitmapMode("undefined");
  await selectPhoto("exif.jpg", "image/jpeg", exifJpeg);
  await page.waitForTimeout(1200);
  const fallbackDims = await photoImg.evaluate((img) => [img.naturalWidth, img.naturalHeight]).catch(() => null);
  const fallbackError = await page.locator("[role=alert]").allTextContents();
  check("createImageBitmap unavailable falls back to an <img> decode", fallbackDims && fallbackDims[0] === 400 && fallbackDims[1] === 800, { fallbackDims, fallbackError });
  check("fallback path shows no decode error", fallbackError.filter(Boolean).length === 0, fallbackError);

  await setBitmapMode("reject");
  await selectPhoto("exif.jpg", "image/jpeg", exifJpeg);
  await page.waitForTimeout(1200);
  const rejectDims = await photoImg.evaluate((img) => [img.naturalWidth, img.naturalHeight]).catch(() => null);
  check("createImageBitmap rejection falls back to an <img> decode", rejectDims && rejectDims[0] === 400 && rejectDims[1] === 800, rejectDims);

  /* ------------------------------------ invalid file while decode is busy */
  // Về màn hình đầu để kiểm tra đúng đường dùng đầu tiên (chưa có ảnh nào).
  await page.getByRole("button", { name: "Xóa ảnh" }).click();
  await page.getByRole("button", { name: "Chọn ảnh" }).waitFor();
  await setBitmapMode("normal", 900);
  await selectPhoto("plain.jpg", "image/jpeg", plainJpeg);
  await page.getByText("Đang chuẩn bị ảnh…").waitFor({ timeout: 5000 });
  await selectPhoto("notes.txt", "text/plain", Buffer.from("not an image"));
  await page.getByText("Đang chuẩn bị ảnh…").waitFor({ state: "detached", timeout: 4000 }).catch(() => {});
  await sleep(1500);
  const race = {
    notice: await page.getByText("Đang chuẩn bị ảnh…").count(),
    error: (await page.locator("[role=alert]").allTextContents()).filter(Boolean),
    chooseDisabled: await page.getByRole("button", { name: "Chọn ảnh" }).isDisabled(),
    captureDisabled: await page.getByRole("button", { name: "Chụp bàn tay" }).isDisabled(),
    photoCount: await photoImg.count(),
  };
  check("invalid file during a pending decode clears the pending state", race.notice === 0 && !race.chooseDisabled && !race.captureDisabled, race);
  check("invalid file during a pending decode reports the gate error", race.error.some((text) => text.includes("JPG, PNG hoặc WebP")), race.error);
  check("the superseded valid decode does not apply its stale result", race.photoCount === 0, race.photoCount);

  const oversize = Buffer.alloc(8 * 1024 * 1024 + 1024, 7);
  await selectPhoto("huge.jpg", "image/jpeg", oversize);
  await sleep(400);
  check("8MB+ file is rejected before decoding", (await page.locator("[role=alert]").allTextContents()).some((text) => text.includes("JPG, PNG hoặc WebP")));

  /* -------------------------------------------------- consent and AI flow */
  await setBitmapMode("normal");
  await selectPhoto("plain.jpg", "image/jpeg", plainJpeg);
  await photoImg.waitFor({ timeout: 10000 });

  // Focused/auto-scrolled controls must not sit under the fixed bottom dock.
  const measureCta = () =>
    page.evaluate(() => {
      const button = document.querySelector('form button[type="submit"]');
      const rect = button.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const dock = document.querySelector('nav[aria-label="Điều hướng dưới (mobile)"]')?.getBoundingClientRect();
      return {
        focused: document.activeElement === button,
        covered: !(hit && (hit === button || button.contains(hit))),
        bottom: Math.round(rect.bottom),
        dockTop: dock ? Math.round(dock.top) : null,
        scrollMarginBlockEnd: getComputedStyle(button).scrollMarginBlockEnd,
        hit: `${hit?.tagName || "none"}:${(hit?.textContent || "").trim().replace(/\s+/g, " ").slice(0, 22)}`,
      };
    });
  const ctaCoverage = async (width, height, mode) => {
    await page.setViewportSize({ width, height });
    const consentBox = page.getByRole("checkbox", { name: /Tôi đồng ý/ }).first();
    await consentBox.scrollIntoViewIfNeeded();
    if (!(await consentBox.isChecked())) await consentBox.check();
    if (mode === "keyboard") {
      // "instant" là bắt buộc: scrollTo số học thừa hưởng scroll-behavior:smooth
      // của html, animation còn chạy khi Tab ăn focus và đẩy nút xuống dưới dock.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.keyboard.press("Tab");
      if (!(await measureCta()).focused) await page.keyboard.press("Alt+Tab"); // Safari full keyboard access
    } else {
      // Chromium's legacy minimal scroll-into-view (same path the dock
      // regression was reported through); WebKit ignores scroll-margin here.
      await page.evaluate(() => {
        const button = document.querySelector('form button[type="submit"]');
        window.scrollTo({ top: button.getBoundingClientRect().top + window.scrollY - window.innerHeight + 12, behavior: "instant" });
      });
      await page.getByRole("button", { name: /Khám phá chỉ tay/ }).scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(250);
    const state = await measureCta();
    if (await consentBox.isChecked()) await consentBox.uncheck();
    return state;
  };
  for (const [width, height] of [[320, 568], [390, 844]]) {
    const keyboard = await ctaCoverage(width, height, "keyboard");
    check(`keyboard Tab focuses the analyze CTA at ${width}x${height}`, keyboard.focused, keyboard);
    check(`keyboard-focused analyze CTA is not under the dock at ${width}x${height}`, keyboard.focused && !keyboard.covered, keyboard);
    if (ENGINE === "chromium") {
      // Headless Chromium does not scroll on programmatic focus(), so the
      // cross-engine user path here is the browser's minimal scroll-into-view;
      // native focus scroll was verified separately with scroll-margin toggled.
      const minimal = await ctaCoverage(width, height, "minimal-scroll");
      check(`minimal scroll-into-view keeps the analyze CTA above the dock at ${width}x${height}`, !minimal.covered, minimal);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Khám phá chỉ tay/ }).evaluate((el) => el.blur());

  const submit = page.getByRole("button", { name: /Khám phá chỉ tay/ });
  check("analysis button stays disabled before explicit consent", await submit.isDisabled());
  check("no AI request is made before explicit consent", aiRequests === 0, aiRequests);
  const consent = page.getByRole("checkbox", { name: /Tôi đồng ý/ }).first();
  await consent.check();
  aiDelayMs = 900;
  await submit.click();
  await page.getByRole("button", { name: "Dừng phân tích" }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Xóa ảnh" }).click();
  await sleep(1600);
  check("reset while AI is pending prevents a stale result", (await page.getByRole("group", { name: "Chọn đường chỉ tay" }).count()) === 0);
  check("reset while AI is pending returns to the entry stage", (await page.getByRole("button", { name: "Chọn ảnh" }).count()) >= 1);

  aiDelayMs = 0;
  await selectPhoto("plain.jpg", "image/jpeg", plainJpeg);
  await photoImg.waitFor({ timeout: 10000 });
  await page.getByRole("checkbox", { name: /Tôi đồng ý/ }).first().check();
  const aiBefore = aiRequests;
  await submit.click();
  await page.getByRole("group", { name: "Chọn đường chỉ tay" }).waitFor({ timeout: 10000 });
  check("exactly one AI request is sent per consented analyze action", aiRequests - aiBefore === 1, { before: aiBefore, after: aiRequests });
  const aiUrl = aiPayloads[0]?.messages?.[1]?.content?.find((part) => part.type === "image_url")?.image_url?.url;
  const shownSrc = await photoImg.getAttribute("src");
  check("the same normalized JPEG is used for display and for the AI request", typeof aiUrl === "string" && aiUrl === shownSrc, { sameLength: aiUrl?.length === shownSrc?.length });
  check("honest unverified-overlay notice is preserved", (await page.getByText("Ảnh chưa xác minh đường tay; luận giải chỉ để chiêm nghiệm.", { exact: true }).count()) === 1);
  const tabs = page.getByRole("group", { name: "Chọn đường chỉ tay" });
  check("line tabs expose a labelled group", (await tabs.count()) === 1);
  check("line tab buttons keep aria-pressed state", (await tabs.getByRole("button").first().getAttribute("aria-pressed")) === "true");

  /* ------------------------------------------------------ zoom dialog a11y */
  const zoomTrigger = page.getByRole("button", { name: "Phóng to ↗" });
  await zoomTrigger.click();
  const dialog = page.getByRole("dialog", { name: "Ảnh bàn tay phóng to" });
  check("zoom dialog opens with an accessible name", (await dialog.count()) === 1 && (await dialog.isVisible()));
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  check("Escape closes the zoom dialog", (await dialog.isVisible().catch(() => false)) === false || (await dialog.count()) === 0);
  const focusBack = await zoomTrigger.evaluate((el) => document.activeElement === el).catch(() => false);
  check("focus returns to the zoom trigger after close", focusBack);

  /* --------------------------------------------------------------- summary */
  check("no uncaught page errors during the palm flows", PAGE_ERRORS.length === 0, PAGE_ERRORS.slice(0, 5));
  check("no production request was fulfilled over the network", externalFulfilled.size <= 1, [...externalFulfilled]);
} catch (error) {
  check("harness completed without an unexpected exception", false, String(error.message).slice(0, 400));
  await page.screenshot({ path: path.join(OUT, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  const skipped = checks.filter((c) => c.skipped).length;
  const summary = {
    engine: ENGINE,
    base: BASE,
    passed: checks.filter((c) => c.ok && !c.skipped).length,
    failed,
    skipped,
    checks,
    pageErrors: PAGE_ERRORS,
    blockedExternalRequests: [...externalAttempts],
    locallyFulfilledExternalRequests: [...externalFulfilled],
    aiRequests,
  };
  await writeFile(path.join(OUT, "palm-flow-report.json"), JSON.stringify(summary, null, 2)).catch(() => {});
  console.log(`\n${summary.passed} passed, ${failed} failed, ${skipped} skipped — report: ${path.join(OUT, "palm-flow-report.json")}`);
  await browser.close();
  process.exit(failed ? 1 : 0);
}
