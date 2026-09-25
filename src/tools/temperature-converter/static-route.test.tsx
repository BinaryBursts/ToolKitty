import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ToolPage, { generateStaticParams } from "@/app/tools/[slug]/page";

/**
 * The temperature converter has no page file of its own: the shared tool
 * template builds `/tools/temperature-converter` from its registry entry
 * (REQ-2). This checks the route the static export actually writes — the tool
 * rendered inside the template, as HTML — rather than the component on its own.
 *
 * The last test reads the export in `out/`, which only exists after
 * `npm run build`. It is skipped when **the export as a whole** has not been
 * run — not when this one file is missing, which is precisely the failure it
 * is here to catch — so the suite stays fast on its own and still fails if a
 * build produces everything except this route.
 */

const SLUG = "temperature-converter";

const exportDir = join(process.cwd(), "out");
const exportedPage = join(exportDir, "tools", `${SLUG}.html`);

/** Render the route exactly as the static export does: params in, element out. */
const renderRoute = async (): Promise<ReactElement> =>
  (await ToolPage({
    params: Promise.resolve({ slug: SLUG }),
    searchParams: Promise.resolve({}),
  })) as ReactElement;

describe("/tools/temperature-converter", () => {
  it("is one of the routes the static export builds", () => {
    expect(generateStaticParams()).toContainEqual({ slug: SLUG });
  });

  it("renders the tool inside the shared template", async () => {
    const markup = renderToStaticMarkup(await renderRoute());

    // The template's own sections, in the order it fixes them in.
    expect(
      [...markup.matchAll(/data-section="([a-z-]+)"/g)].map(
        (match) => match[1],
      ),
    ).toEqual([
      "intro",
      "tool",
      "privacy",
      "supporting-copy",
      "more-tools",
      "ad-reserve",
    ]);

    // ...with this tool's controls inside it.
    expect(markup).toContain("Temperature to convert");
    expect(markup).toContain("Convert from");
    expect(markup).toContain("Swap scales");
    expect(markup).toContain("Copy result");
  });

  it.skipIf(!existsSync(exportDir))(
    "is written to out/tools/temperature-converter.html by the export",
    () => {
      // The build ran, so this route must be among what it wrote.
      expect(existsSync(exportedPage)).toBe(true);

      const html = readFileSync(exportedPage, "utf8");

      expect(html).toContain("Temperature to convert");
      expect(html).toContain("Swap scales");
      // The tool is inside the shared template, not a page of its own.
      expect(html).toContain('data-section="tool"');
    },
  );
});
