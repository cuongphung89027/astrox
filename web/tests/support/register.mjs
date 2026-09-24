import { createRequire, registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const SRC = new URL("../../src/", import.meta.url);
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];
const mocks = (globalThis.__astroxMocks ??= new Map());

function withExtension(url) {
  const path = fileURLToPath(url);
  if (/\.(m?[jt]sx?|css|json)$/.test(path) && existsSync(path)) return url;
  for (const ext of EXTENSIONS) if (existsSync(path + ext)) return pathToFileURL(path + ext).href;
  return null;
}

registerHooks({
  resolve(specifier, context, next) {
    // Each fixture imports its entry with ?v=N; the version flows to relative imports so every fixture gets a fresh module graph.
    const version = context.parentURL?.match(/[?&]v=(\d+)/)?.[1];
    if (version && mocks.has(`${version}:${specifier}`)) return { url: `astrox-mock:${version}:${specifier}`, shortCircuit: true };
    const query = specifier.match(/\?.*$/)?.[0] ?? (version ? `?v=${version}` : "");
    const bare = specifier.replace(/\?.*$/, "");
    let candidate = null;
    if (bare.startsWith("@/")) candidate = new URL(bare.slice(2), SRC).href;
    else if ((bare.startsWith(".") || bare.startsWith("/")) && context.parentURL?.startsWith("file:")) candidate = new URL(bare, context.parentURL).href;
    if (candidate) {
      const found = withExtension(candidate);
      if (found && /\.(tsx?|css)$/.test(found)) return { url: found + query, shortCircuit: true };
      if (found) return { url: found, shortCircuit: true };
    }
    try {
      return next(specifier, context);
    } catch (error) {
      if (error?.code !== "ERR_MODULE_NOT_FOUND" || !context.parentURL?.startsWith("file:")) throw error;
      return { url: pathToFileURL(createRequire(context.parentURL).resolve(specifier)).href, shortCircuit: true };
    }
  },
  load(url, context, next) {
    if (url.startsWith("astrox-mock:")) {
      const name = url.slice("astrox-mock:".length);
      const keys = Object.keys(mocks.get(name)).filter(k => k !== "default" && /^[A-Za-z_$][\w$]*$/.test(k));
      const source = `const m=globalThis.__astroxMocks.get(${JSON.stringify(name)});export default m.default??m;${keys.map(k => `export const ${k}=m[${JSON.stringify(k)}];`).join("")}`;
      return { format: "module", source, shortCircuit: true };
    }
    const path = url.startsWith("file:") ? fileURLToPath(url.replace(/\?.*$/, "")) : "";
    if (path.endsWith(".css")) return { format: "module", source: "export default new Proxy({}, { get: (_, key) => key });", shortCircuit: true };
    if (/\.tsx?$/.test(path)) {
      const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
        fileName: path,
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, verbatimModuleSyntax: false },
      });
      return { format: "module", source: outputText, shortCircuit: true };
    }
    return next(url, context);
  },
});
