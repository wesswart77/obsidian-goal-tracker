import esbuild from "esbuild";
import process from "process";

const builtins = ["path","os","fs","child_process","crypto","events","http","https","net","stream","url","util","zlib","assert","buffer","constants","domain","module","punycode","querystring","readline","string_decoder","sys","timers","tty","v8","vm","worker_threads"];
const prod = process.argv[2] === "production";
const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian","electron","@codemirror/autocomplete","@codemirror/collab","@codemirror/commands","@codemirror/language","@codemirror/lint","@codemirror/search","@codemirror/state","@codemirror/view","@lezer/common","@lezer/highlight","@lezer/lr",...builtins],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
});
if (prod) { await context.rebuild(); process.exit(0); } else { await context.watch(); }
