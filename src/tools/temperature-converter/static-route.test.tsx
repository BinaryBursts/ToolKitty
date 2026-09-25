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
 * The last test reads `out/`, which only exists after `npm run build`. It is
 * skipped when the export has not been run, so the suite stays fast on its own
 * and still checks the real artefact when the build has produced one.
 */

const SLUG = "temperature-converter";

const exportedPage = join(process.cwd(), "out", "tools", `${SLUG}.html`);

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

  it.skipIf(!existsSync(exportedPage))(
    "is written to out/tools/temperature-converter.html by the export",
    () => {
      const html = readFileSync(exportedPage, "utf8");

      expect(html).toContain("Temperature to convert");
      expect(html).toContain("Swap scales");
    },
  );
});
