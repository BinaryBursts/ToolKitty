import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

/**
 * The slow one: it runs the real static export and reads the files that come
 * out of it (REQ-10 / TKT-16).
 *
 * Rendering the component in jsdom proves the copy is right; only the build
 * proves the route is actually written to disk, which is the whole of what the
 * host serves. The build is run here rather than assumed, so the check cannot
 * pass against a stale `out/` left over from an earlier run.
 *
 * Next is invoked through `node` and the resolved CLI entry point rather than
 * `npm run build`, so the test does not depend on how npm shims a binary on
 * the machine running it, and the build's own output is surfaced when it
 * fails — a silent non-zero exit here would look like a missing page.
 */

const projectRoot = process.cwd();
const outDir = join(projectRoot, "out");
const nextCli = createRequire(import.meta.url).resolve("next/dist/bin/next");

const readExported = (file: string): string => {
  const path = join(outDir, file);

  return existsSync(path) ? readFileSync(path, "utf8") : "";
};

let privacyHtml = "";
let homeHtml = "";
let notFoundHtml = "";

describe("the static export", () => {
  beforeAll(() => {
    try {
      execFileSync(process.execPath, [nextCli, "build"], {
        cwd: projectRoot,
        stdio: "pipe",
        encoding: "utf8",
      });
    } catch (error) {
      const { stdout = "", stderr = "" } = error as {
        stdout?: string;
        stderr?: string;
      };

      throw new Error(`next build failed:\n${stdout}\n${stderr}`);
    }

    privacyHtml = readExported("privacy.html");
    homeHtml = readExported("index.html");
    notFoundHtml = readExported("404.html");
    // Ten minutes: a cold Next build on a loaded CI runner is slow, and a
    // timeout here would read as a failed export rather than a slow machine.
  }, 600_000);

  it("writes an HTML file for /privacy", () => {
    expect(existsSync(join(outDir, "privacy.html"))).toBe(true);
    expect(privacyHtml.length).toBeGreaterThan(0);
  });

  it("renders the policy into that file, so it reads with JavaScript off", () => {
    const text = privacyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    expect(text).toContain("Privacy policy");
    expect(text).toContain("Google Analytics");
    expect(text).toContain("Google AdSense");
    expect(text).toMatch(/only after you accept/i);
    expect(text).toMatch(/sets its own cookies/i);
    expect(text).toMatch(/never sent to a server/i);
    expect(text).toMatch(/Last updated 14 September 2026/);
  });

  it("publishes the contact address as a mailto link, not a form", () => {
    expect(privacyHtml).toContain("mailto:");
    expect(/<(form|input|textarea|select)[\s>]/i.test(privacyHtml)).toBe(false);
  });

  it("sits inside the shared header and footer", () => {
    expect(privacyHtml).toContain('class="o-topbar"');
    expect(privacyHtml).toContain('class="o-footer"');
  });

  it("is reachable from the footer of the other exported pages too", () => {
    // AC1 is "reachable from the footer link on every page", so the link is
    // checked on pages this ticket did not write: the homepage and the 404.
    expect(homeHtml).toContain('href="/privacy"');
    expect(notFoundHtml).toContain('href="/privacy"');
  });
});
