import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { OPERATOR_NAME } from "@/config/site";

/**
 * The slow one: it runs the real static export and reads the files that come
 * out of it (REQ-10 / TKT-16, extended for the About page by TKT-19).
 *
 * Both of REQ-10's pages are checked here, from the one build. A second file
 * running its own `next build` would race this one over `.next/` and `out/`,
 * since Vitest runs test files in parallel — so `/about`'s export assertions
 * live beside `/privacy`'s rather than under `src/app/about/`.
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

/**
 * Every exported tool page, read from `out/tools/` rather than from a list of
 * slugs written here — so the footer check below covers whatever tools the
 * registry holds on the day it runs.
 */
const exportedToolPages = (): readonly string[] => {
  const toolsDir = join(outDir, "tools");

  if (!existsSync(toolsDir)) return [];

  return readdirSync(toolsDir)
    .filter((file) => file.endsWith(".html"))
    .map((file) => readFileSync(join(toolsDir, file), "utf8"));
};

let privacyHtml = "";
let aboutHtml = "";
let homeHtml = "";
let notFoundHtml = "";
let toolHtml: readonly string[] = [];

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
    aboutHtml = readExported("about.html");
    homeHtml = readExported("index.html");
    notFoundHtml = readExported("404.html");
    toolHtml = exportedToolPages();
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

  it("writes an HTML file for /about", () => {
    expect(existsSync(join(outDir, "about.html"))).toBe(true);
    expect(aboutHtml.length).toBeGreaterThan(0);
  });

  it("renders the About copy into that file, so it reads with JavaScript off", () => {
    const text = aboutHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    expect(text).toContain("About ToolKitty");
    expect(text).toMatch(/small tools that never phone home/i);
    expect(text).toMatch(/the work happens on your device/i);
    // Who runs it, and the pointer to the policy for the analytics detail.
    expect(text).toContain(OPERATOR_NAME);
    expect(aboutHtml).toContain('href="/privacy"');
  });

  it("publishes the same contact address as the policy, as a mailto link", () => {
    const mailto = /mailto:([^"]+)"/;

    const onAbout = mailto.exec(aboutHtml)?.[1];
    const onPrivacy = mailto.exec(privacyHtml)?.[1];

    expect(onAbout).toBeTruthy();
    expect(onAbout).toBe(onPrivacy);
  });

  it("puts no form control on either page", () => {
    for (const html of [aboutHtml, privacyHtml]) {
      expect(/<(form|input|textarea|select)[\s>]/i.test(html)).toBe(false);
    }
  });

  it("puts the About page inside the shared header and footer too", () => {
    expect(aboutHtml).toContain('class="o-topbar"');
    expect(aboutHtml).toContain('class="o-footer"');
  });

  it("links About and Privacy policy from every exported page type", () => {
    expect(toolHtml.length).toBeGreaterThan(0);

    const everyPage = [
      homeHtml,
      notFoundHtml,
      aboutHtml,
      privacyHtml,
      ...toolHtml,
    ];

    for (const html of everyPage) {
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain('href="/about"');
      expect(html).toContain('href="/privacy"');
    }
  });
});
