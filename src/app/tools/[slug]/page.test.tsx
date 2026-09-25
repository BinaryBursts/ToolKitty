import { render, screen, within } from "@testing-library/react";
import { type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TOOL_PAGE_SECTIONS } from "@/components/layout/ToolPageTemplate";
import { SITE_BASE_URL } from "@/config/site";
import { getAllTools } from "@/tools/registry";

import ToolPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from "./page";

// The root layout is rendered at the foot of this file to check the whole page
// order. `next/font/google` only exists inside the Next compiler, and
// globals.css is a Tailwind entry point, so both are stubbed the way
// `src/app/layout.test.tsx` stubs them.
vi.mock("next/font/google", () => {
  const font = (variable: string) => () => ({
    className: "mock-font",
    variable,
    style: { fontFamily: variable },
  });

  return {
    Outfit: font("--font-outfit"),
    Manrope: font("--font-manrope"),
    DM_Mono: font("--font-dm-mono"),
  };
});
vi.mock("../../globals.css", () => ({}));

/** Render the route exactly as the static export does: params in, element out. */
const renderRoute = async (slug: string): Promise<ReactElement> =>
  (await ToolPage({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve({}),
  })) as ReactElement;

const metadataFor = (slug: string) =>
  generateMetadata({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve({}),
  });

describe("generateStaticParams", () => {
  it("returns one params object per registry entry, in registry order", () => {
    expect(generateStaticParams()).toEqual(
      getAllTools().map((tool) => ({ slug: tool.slug })),
    );
  });

  it("covers the four launch slugs", () => {
    expect(generateStaticParams().map((params) => params.slug)).toEqual([
      "weight-converter",
      "temperature-converter",
      "password-generator",
      "json-formatter",
    ]);
  });

  it("builds no page for a slug the registry does not know", () => {
    // There is no server, so an unlisted slug must not be rendered on demand.
    expect(dynamicParams).toBe(false);
  });
});

describe("generateMetadata", () => {
  it.each(getAllTools())(
    "$slug uses the registry's SEO title verbatim, without the layout's template",
    async (tool) => {
      const metadata = await metadataFor(tool.slug);

      // `absolute` is what stops the root layout appending "· ToolKitty" to a
      // title that already ends in "| ToolKitty".
      expect(metadata.title).toEqual({ absolute: tool.seoTitle });
    },
  );

  it.each(getAllTools())(
    "$slug carries the registry's meta description",
    async (tool) => {
      expect((await metadataFor(tool.slug)).description).toBe(
        tool.metaDescription,
      );
    },
  );

  it.each(getAllTools())(
    "$slug is canonical at the site base URL plus its path",
    async (tool) => {
      expect((await metadataFor(tool.slug)).alternates?.canonical).toBe(
        `${SITE_BASE_URL}/tools/${tool.slug}`,
      );
    },
  );

  it("returns nothing for an unknown slug rather than inventing a title", async () => {
    expect(await metadataFor("does-not-exist")).toEqual({});
  });
});

describe("ToolPage", () => {
  it.each(getAllTools())("$slug renders its name as the h1", async (tool) => {
    render(await renderRoute(tool.slug));

    expect(
      screen.getByRole("heading", { level: 1, name: tool.name }),
    ).toBeInTheDocument();
  });

  it.each(getAllTools())(
    "$slug renders the shared sections in the fixed order",
    async (tool) => {
      const { container } = render(await renderRoute(tool.slug));

      expect(
        [...container.querySelectorAll("[data-section]")].map((section) =>
          section.getAttribute("data-section"),
        ),
      ).toEqual([...TOOL_PAGE_SECTIONS]);
    },
  );

  it("sends an unknown slug to the site's 404 page", async () => {
    // `notFound()` signals the not-found boundary by throwing; the route must
    // not render a page for a slug the registry has never had.
    await expect(renderRoute("does-not-exist")).rejects.toThrow();
  });
});

/**
 * The header and footer come from the root layout, so the full page order —
 * header, tool heading, privacy notice, tool, supporting copy, more tools,
 * reserved ad space, footer — is only visible with the layout wrapped around
 * the route.
 */
describe("a tool page inside the site shell", () => {
  const renderWholePage = async (slug: string): Promise<Document> => {
    const { default: RootLayout } = await import("@/app/layout");

    const markup = renderToStaticMarkup(
      <RootLayout params={Promise.resolve({})}>
        {await renderRoute(slug)}
      </RootLayout>,
    );

    document.open();
    document.write(`<!DOCTYPE html>${markup}`);
    document.close();

    return document;
  };

  it("puts the header first, the footer last and the tool sections in between", async () => {
    const doc = await renderWholePage("weight-converter");

    const landmarks = [
      ...doc.querySelectorAll(
        "header.o-topbar, [data-section], footer.o-footer",
      ),
    ].map((element) =>
      element.tagName === "HEADER"
        ? "header"
        : element.tagName === "FOOTER"
          ? "footer"
          : element.getAttribute("data-section"),
    );

    expect(landmarks).toEqual(["header", ...TOOL_PAGE_SECTIONS, "footer"]);
  });

  it.each(getAllTools())(
    "$slug reads the privacy notice out inside main, before the tool (REQ-9)",
    async (tool) => {
      const doc = await renderWholePage(tool.slug);

      const notice = doc.querySelector("main.o-main .t-privacy");
      const toolSection = doc.querySelector('[data-section="tool"]');

      // Inside the page's main landmark, and ahead of the tool's controls in
      // reading order, so a screen reader meets the claim before the fields.
      expect(notice).not.toBeNull();
      expect(notice?.textContent).toContain(
        "Everything you type into this tool stays in your browser.",
      );
      expect(
        notice!.compareDocumentPosition(toolSection!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        doc.querySelector('main.o-main .t-privacy a[href="/privacy"]'),
      ).not.toBeNull();
    },
  );
});

/**
 * The tools that have been built render themselves on their own route: the
 * registry entry, the shared template and the component meet here, which is
 * the only place that pairing is checked (REQ-2).
 */
describe("the tool a route renders", () => {
  it("renders the JSON beautifier, paste-only, at /tools/json-formatter", async () => {
    const { container } = render(await renderRoute("json-formatter"));
    const queries = within(container);

    expect(queries.getByLabelText("Paste your JSON")).toBeInTheDocument();
    expect(queries.getByLabelText("Formatted output")).toBeInTheDocument();
    expect(
      queries.getByRole("button", { name: /Beautify/ }),
    ).toBeInTheDocument();

    // Paste or type only: the route carries no file picker and no URL field.
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(0);
    expect(container.querySelectorAll('input[type="url"]')).toHaveLength(0);
  });
});
