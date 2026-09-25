import { within } from "@testing-library/dom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// `next/font/google` is a build-time loader that only exists inside the Next
// compiler, so it is stubbed here with the shape the layout consumes.
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

// globals.css is a Tailwind entry point; Vitest is configured with `css: false`
// but the import still has to resolve to something.
vi.mock("./globals.css", () => ({}));

/** Render the root layout to HTML, exactly as the static export writes it. */
const renderLayoutMarkup = async (): Promise<string> => {
  const { default: RootLayout } = await import("./layout");

  return renderToStaticMarkup(
    // The layout's props come from Next's generated route types; a unit test
    // only supplies `children` and the (unused) route params.
    <RootLayout params={Promise.resolve({})}>
      <p>Page content</p>
    </RootLayout>,
  );
};

/**
 * Load that markup into the test document, so the whole document — `<html>`
 * included — can be queried the way a browser would see it.
 */
const renderLayout = async (): Promise<Document> => {
  const markup = await renderLayoutMarkup();

  document.open();
  document.write(`<!DOCTYPE html>${markup}`);
  document.close();

  return document;
};

describe("RootLayout", () => {
  it("wraps the page in the shared header, main content area and footer", async () => {
    const doc = await renderLayout();

    expect(doc.documentElement).toHaveAttribute("lang", "en");
    expect(doc.querySelector("header.o-topbar")).not.toBeNull();
    expect(doc.querySelector("footer.o-footer")).not.toBeNull();

    const main = doc.querySelector("main#content");
    expect(main).not.toBeNull();
    expect(main?.textContent).toContain("Page content");
  });

  it("resolves the header links to / and /about", async () => {
    const doc = await renderLayout();

    const header = doc.querySelector<HTMLElement>("header.o-topbar");
    expect(header).not.toBeNull();

    const nav = within(header!).getAllByRole("navigation", { name: "Main" })[0];
    const hrefs = [...nav!.querySelectorAll("a")].map((a) =>
      a.getAttribute("href"),
    );

    expect(hrefs).toEqual(["/", "/about"]);
    expect(
      within(header!).getAllByRole("link", { name: "ToolKitty" })[0],
    ).toHaveAttribute("href", "/");
  });

  it("resolves the footer links to /, /about and /privacy", async () => {
    const doc = await renderLayout();

    const footer = doc.querySelector<HTMLElement>("footer.o-footer");
    expect(footer).not.toBeNull();

    const nav = within(footer!).getByRole("navigation", { name: "Footer" });
    const hrefs = [...nav.querySelectorAll("a")].map((a) =>
      a.getAttribute("href"),
    );

    expect(hrefs).toEqual(["/", "/about", "/privacy"]);
  });

  it("puts a skip link to #content first in the tab order", async () => {
    const doc = await renderLayout();

    const firstLink = doc.querySelector("body a");

    expect(firstLink).toHaveClass("o-skip");
    expect(firstLink).toHaveAttribute("href", "#content");
  });

  it("carries no theme script and touches no browser storage", async () => {
    const markup = await renderLayoutMarkup();

    // An inline theme script is the usual way sites avoid a wrong-scheme
    // flash; ToolKitty uses the prefers-color-scheme media query instead, so
    // there must be nothing script-shaped in the shell (REQ-3).
    expect(markup).not.toContain("<script");
    expect(markup).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
  });
});
