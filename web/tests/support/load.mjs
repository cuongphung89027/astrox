import "./register.mjs";
import * as React from "react";

let version = 0;

/**
 * Starts a fresh module graph over the real web/src sources. `mocks` replace
 * imports by their exact specifier; `globals` stand in for browser APIs.
 */
export function graph({ mocks = {}, globals = {} } = {}) {
  const v = ++version;
  for (const [name, value] of Object.entries(mocks)) globalThis.__astroxMocks.set(`${v}:${name}`, value);
  setGlobals(globals);
  return path => import(new URL(`../../src/${path}?v=${v}`, import.meta.url).href);
}

export const load = (path, options) => graph(options)(path);

export function setGlobals(globals) {
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

export function memoryStorage(data = new Map()) {
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k), data };
}

/** Minimal hook runtime: call `render()` to re-run the component, `flushEffects()` to run pending effects. */
export function hookRuntime() {
  const hooks = [], effects = [], cleanups = [];
  let cursor = 0;
  const react = {
    ...React,
    createContext: () => ({ Provider: "provider" }),
    useContext: () => null,
    useCallback: fn => fn,
    useMemo: fn => fn(),
    useSyncExternalStore: (_, get) => get(),
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === "function" ? initial() : initial; return [hooks[i], value => { hooks[i] = typeof value === "function" ? value(hooks[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return (hooks[i] ??= { current: initial }); },
    useEffect(effect, deps) { const i = cursor++; if (!hooks[i] || !deps || deps.some((d, j) => d !== hooks[i].deps[j])) { hooks[i] = { deps }; effects.push(effect); } },
  };
  react.useLayoutEffect = react.useEffect;
  return {
    react,
    reset: () => { cursor = 0; },
    flushEffects: () => { for (const effect of effects.splice(0)) { const cleanup = effect(); if (typeof cleanup === "function") cleanups.push(cleanup); } },
    unmount: () => cleanups.splice(0).forEach(fn => fn()),
  };
}

export function nodes(node) {
  if (node == null || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
