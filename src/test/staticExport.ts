import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

/**
 * Running the real static export from a test, and reading what came out of it.
 *
 * Rendering a component in jsdom proves the markup is right; only the build
 * proves the HTML is written to disk, which is the whole of what the host
 * serves. The build is run rather than assumed, so a check cannot pass against
 * a stale `out/` left over from an earlier run.
 *
 * Next is invoked through `node` and the resolved CLI entry point rather than
 * `npm run build`, so the tests do not depend on how npm shims a binary on the
 * machine running them, and the build's own output is surfaced when it fails —
 * a silent non-zero exit would otherwise look like a missing page.
 *
 * Vitest runs test files in parallel and Next refuses to run two builds in the
 * same project at once, so a file that finds a build already in progress waits
 * for it and tries again instead of failing.
 */

const projectRoot = process.cwd();

/** Where `next build` writes the exported site (see `next.config.ts`). */
export const OUT_DIR = join(projectRoot, "out");

const nextCli = createRequire(import.meta.url).resolve("next/dist/bin/next");

const BUILD_ALREADY_RUNNING = /Another next build process is already running/;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Build the static export, waiting out a build another test file is running. */
export async function runStaticExport(attempts = 30): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      execFileSync(process.execPath, [nextCli, "build"], {
        cwd: projectRoot,
        stdio: "pipe",
        encoding: "utf8",
      });

      return;
    } catch (error) {
      const { stdout = "", stderr = "" } = error as {
        stdout?: string;
        stderr?: string;
      };

      if (BUILD_ALREADY_RUNNING.test(stdout + stderr) && attempt < attempts) {
        await delay(3_000);
        continue;
      }

      throw new Error(`next build failed:\n${stdout}\n${stderr}`);
    }
  }
}

/** The contents of one exported file, or "" when the build did not write it. */
export function readExported(file: string): string {
  const path = join(OUT_DIR, file);

  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

/** An exported page as a visitor reads it: tags out, whitespace collapsed. */
export function exportedText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}
