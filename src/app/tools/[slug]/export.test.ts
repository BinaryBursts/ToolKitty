import { existsSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  OUT_DIR,
  exportedText,
  readExported,
  runStaticExport,
} from "@/test/staticExport";
import { getAllTools } from "@/tools/registry";

/**
 * The privacy notice in the files the host actually serves (REQ-9 / TKT-20).
 *
 * The template test proves the notice is rendered; this proves it survives the
 * static export — present in every tool page's HTML as text, with the link to
 * the policy, and ahead of the tool in the source order a screen reader and a
 * crawler both follow. It runs the real build, which is why it is a file of
 * its own rather than another case in the template's suite.
 */

const tools = getAllTools();

/** The sentence a future template change would have to delete to break REQ-9. */
const CLAIM = "Everything you type into this tool stays in your browser.";

const exported = new Map<string, string>();

describe("the exported tool pages", () => {
  beforeAll(async () => {
    await runStaticExport();

    for (const tool of tools) {
      exported.set(tool.slug, readExported(join("tools", `${tool.slug}.html`)));
    }
    // Ten minutes: a cold Next build on a loaded CI runner is slow, and a
    // timeout here would read as a failed export rather than a slow machine.
  }, 600_000);

  it("writes an HTML file for every registered tool", () => {
    for (const tool of tools) {
      expect(
        existsSync(join(OUT_DIR, "tools", `${tool.slug}.html`)),
        `no exported page for ${tool.slug}`,
      ).toBe(true);
    }

    expect(tools.length).toBeGreaterThanOrEqual(4);
  });

  it.each(tools)(
    "$slug states in its HTML that what is typed stays in the browser",
    (tool) => {
      const text = exportedText(exported.get(tool.slug) ?? "");

      expect(text).toContain(CLAIM);
      expect(text).toContain("never sent to a server");
    },
  );

  it.each(tools)(
    "$slug also names the analytics and advertising that do set cookies",
    (tool) => {
      const text = exportedText(exported.get(tool.slug) ?? "");

      expect(text).toContain("anonymous page analytics");
      expect(text).toMatch(/only if you accept/);
      expect(text).toContain("set their own cookies");
    },
  );

  it.each(tools)("$slug links the notice to /privacy", (tool) => {
    const html = exported.get(tool.slug) ?? "";
    const notice = html.slice(html.indexOf("t-privacy"));

    expect(notice).toContain('href="/privacy"');
    expect(notice).toContain("How we handle data");
  });

  it.each(tools)("$slug carries the notice as text, not an image", (tool) => {
    const html = exported.get(tool.slug) ?? "";
    const notice = html.slice(
      html.indexOf("t-privacy"),
      html.indexOf('data-section="tool"'),
    );

    // The only graphic in the notice is the decorative padlock; the words are
    // words, so they are indexed and read out.
    expect(notice).not.toMatch(/<img[\s>]/i);
    expect(notice).toContain(CLAIM);
  });

  it.each(tools)("$slug puts the notice above the tool in the HTML", (tool) => {
    const html = exported.get(tool.slug) ?? "";

    expect(html.indexOf('data-section="privacy"')).toBeGreaterThan(-1);
    expect(html.indexOf('data-section="privacy"')).toBeLessThan(
      html.indexOf('data-section="tool"'),
    );
  });
});
