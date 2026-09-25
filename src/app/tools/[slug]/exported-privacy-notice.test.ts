import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { getAllTools } from "@/tools/registry";

/**
 * The in-browser privacy claim in the files the host actually serves
 * (REQ-9 / TKT-20).
 *
 * `PrivacyNotice.test.tsx` proves the notice is rendered and `page.test.tsx`
 * proves where it sits in the page; this proves it survives the static export
 * on every tool page — as text a crawler and a screen reader can read, never
 * an image, with the link to the policy.
 *
 * It reads `out/` rather than running `next build` of its own, the way the
 * tools' `static-route.test.tsx` files do: Vitest runs test files in parallel
 * and Next refuses two builds in one project at once, so the one build in
 * `src/app/privacy/export.test.ts` is the only one. The checks are skipped
 * when **the export as a whole** has not been run — not when a tool page is
 * missing from it, which is precisely what they are here to catch.
 */

const exportDir = join(process.cwd(), "out");
const toolsDir = join(exportDir, "tools");

/** The sentence a future template change would have to delete to break REQ-9. */
const CLAIM = "Everything you type into this tool stays in your browser.";

/** Every exported tool page, keyed by the slug whose file it came from. */
const exportedToolPages = (): [string, string][] => {
  if (!existsSync(toolsDir)) return [];

  return readdirSync(toolsDir)
    .filter((file) => file.endsWith(".html"))
    .map((file) => [
      file.replace(/\.html$/, ""),
      readFileSync(join(toolsDir, file), "utf8"),
    ]);
};

/** An exported page as a visitor reads it: tags out, whitespace collapsed. */
const textOf = (html: string): string =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe.skipIf(!existsSync(exportDir))("the exported tool pages", () => {
  const pages = exportedToolPages();

  it("are one per registry entry, so none is checked by accident", () => {
    // A guard on the checks below: an empty list would pass every one of them.
    expect(pages.map(([slug]) => slug).sort()).toEqual(
      getAllTools()
        .map((tool) => tool.slug)
        .sort(),
    );
  });

  it.each(pages)("%s says what stays in the browser", (slug, html) => {
    const text = textOf(html);

    expect(text, `${slug} omits the claim`).toContain(CLAIM);
    expect(text, `${slug} omits the server claim`).toContain(
      "never sent to a server",
    );
  });

  it.each(pages)(
    "%s also names the analytics and advertising that set cookies",
    (slug, html) => {
      const text = textOf(html);

      expect(text, `${slug} omits the analytics disclosure`).toContain(
        "anonymous page analytics",
      );
      expect(text, `${slug} omits the consent condition`).toMatch(
        /only if you accept/,
      );
      expect(text, `${slug} omits the cookies the site does set`).toContain(
        "set their own cookies",
      );
    },
  );

  it.each(pages)(
    "%s puts the notice above the tool and links it to /privacy",
    (slug, html) => {
      const noticeAt = html.indexOf('data-section="privacy"');
      const toolAt = html.indexOf('data-section="tool"');

      expect(noticeAt, `${slug} has no privacy notice`).toBeGreaterThan(-1);
      expect(noticeAt, `${slug} puts the notice after the tool`).toBeLessThan(
        toolAt,
      );

      const notice = html.slice(noticeAt, toolAt);

      expect(notice, `${slug} does not link the notice`).toContain(
        'href="/privacy"',
      );
      expect(notice).toContain("How we handle data");
    },
  );

  it.each(pages)(
    "%s carries the notice as text, not an image",
    (slug, html) => {
      const notice = html.slice(
        html.indexOf('data-section="privacy"'),
        html.indexOf('data-section="tool"'),
      );

      expect(
        /<img[\s>]/i.test(notice),
        `${slug} renders the notice as an image`,
      ).toBe(false);
      expect(notice).toContain(CLAIM);
    },
  );

  it.each(pages)(
    "%s keeps the notice inside the main landmark",
    (slug, html) => {
      const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));

      expect(main, `${slug} puts the notice outside main`).toContain(
        'data-section="privacy"',
      );
      expect(main).toContain(CLAIM);
    },
  );
});
