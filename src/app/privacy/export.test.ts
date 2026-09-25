import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

/**
 * The slow one: it runs the real static export and reads the file that comes
 * out of it (REQ-10 / TKT-16).
 *
 * Rendering the component in jsdom proves the copy is right; only the build
 * proves the route is actually written to disk, which is the whole of what the
 * host serves. The build is run here rather than assumed, so the check cannot
 * pass against a stale `out/` left over from an earlier run.
 */

const projectRoot = process.cwd();
const exportedPage = join(projectRoot, "out", "privacy.html");

let html = "";

describe("the static export", () => {
  beforeAll(() => {
    execFileSync("npm", ["run", "build"], {
      cwd: projectRoot,
      stdio: "ignore",
    });

    html = existsSync(exportedPage) ? readFileSync(exportedPage, "utf8") : "";
    // Ten minutes: a cold Next build on a loaded CI runner is slow, and a
    // timeout here would read as a failed export rather than a slow machine.
  }, 600_000);

  it("writes an HTML file for /privacy", () => {
    expect(existsSync(exportedPage)).toBe(true);
    expect(html.length).toBeGreaterThan(0);
  });

  it("renders the policy into that file, so it reads with JavaScript off", () => {
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    expect(text).toContain("Privacy policy");
    expect(text).toContain("Google Analytics");
    expect(text).toContain("Google AdSense");
    expect(text).toMatch(/only after you accept/i);
    expect(text).toMatch(/never sent to a server/i);
    expect(text).toMatch(/Last updated 14 September 2026/);
  });

  it("holds no form control in the exported markup", () => {
    expect(/<(form|input|textarea|select)[\s>]/i.test(html)).toBe(false);
  });

  it("sits inside the shared header and footer, with the footer link back", () => {
    expect(html).toContain('class="o-topbar"');
    expect(html).toContain('class="o-footer"');
    expect(html).toContain('href="/privacy"');
  });
});
