// Temporary manual check for TKT-7: serve the static export with the repo's own
// `npm start` (serve out) and request a known path, an unknown tool slug and an
// unknown path, reporting the HTTP status and the page title of each.
import { spawn } from "node:child_process";

const PORT = 4173;
const base = `http://127.0.0.1:${PORT}`;
const server = spawn("npx", ["serve", "out", "-l", String(PORT)], {
  stdio: "ignore",
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const waitForServer = async () => {
  for (let i = 0; i < 60; i += 1) {
    try {
      await fetch(`${base}/`);
      return true;
    } catch {
      await sleep(250);
    }
  }
  return false;
};

if (!(await waitForServer())) {
  console.error("server never came up");
  server.kill();
  process.exit(1);
}

for (const path of [
  "/",
  "/tools/weight-converter",
  "/tools/does-not-exist",
  "/nope/at/all",
]) {
  const res = await fetch(base + path);
  const body = await res.text();
  const title = body.match(/<title[^>]*>([^<]*)/)?.[1] ?? "(no title)";
  const robots = /<meta name="robots" content="noindex/.test(body);
  console.log(
    `${path} -> ${res.status} | title: ${title} | noindex: ${robots}`,
  );
}

server.kill();
