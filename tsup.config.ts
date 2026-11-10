import { defineConfig } from "tsup";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("./package.json", "utf8"));

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  define: { __PACKAGE_VERSION__: JSON.stringify(version) },
});
