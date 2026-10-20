// Keep test configuration in this child process, never in the developer's shell.
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("node:child_process");
const next = require.resolve("next/dist/bin/next");
const env = { ...process.env, INVENTORY_E2E: "1", INVENTORY_PERSISTENCE_MODE: "memory", NODE_ENV: "production" };
let child;
function run(args) {
  return new Promise((resolve) => {
    child = spawn(process.execPath, [next, ...args], { env, stdio: "inherit" });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", (error) => { console.error(error); resolve(1); });
  });
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => { child?.kill(signal); process.exit(0); });
}
(async () => {
  const code = await run(["build"]);
  if (code) process.exit(code);
  process.exit(await run(["start", "--hostname", "127.0.0.1", "--port", "3100"]));
})();
