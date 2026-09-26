import { within } from "@testing-library/dom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { useConsent } from "@/components/consent/ConsentProvider";

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

describe("the shell's consent state", () => {
  /** A page that asks the shell what the visitor has answered. */
  function ConsentProbe() {
    const { consent } = useConsent();

    return <p>consent: {consent}</p>;
  }

  it("wraps every page in the consent provider", async () => {
    const { default: RootLayout } = await import("./layout");

    // `useConsent` throws outside a provider, so this rendering at all is the
    // assertion: whatever page Next puts inside the layout can read the one
    // session answer the banner and the analytics loader share (REQ-11).
    const markup = renderToStaticMarkup(
      <RootLayout params={Promise.resolve({})}>
        <ConsentProbe />
      </RootLayout>,
    );

    expect(markup).toContain("consent: unanswered");
  });

  it("leaves the banner out of the exported HTML, where it could not be answered", async () => {
    const markup = await renderLayoutMarkup();

    // The banner arrives with the first client render instead (see
    // `ConsentBanner`): with JavaScript off nothing can load analytics and
    // nothing could dismiss a baked-in bar, and rendering it with the space
    // reserved for it means it never covers the page, even for a frame.
    expect(markup).not.toContain("t-consent");
    expect(markup).not.toContain("Analytics cookies?");
  });

  it("mounts the banner itself, last, after the footer", async () => {
    // The banner renders nothing until it is hydrated, so its absence from
    // the markup above proves nothing about the layout still mounting it.
    // Standing a marker in its place is what does: delete <ConsentBanner />
    // from the shell and this fails, which is the whole point — every page
    // gets the banner because the layout, and only the layout, mounts it
    // (REQ-11).
    vi.resetModules();
    vi.doMock("@/components/consent/ConsentBanner", () => ({
      ConsentBanner: () => <div data-banner="mounted" />,
    }));

    try {
      const { default: RootLayout } = await import("./layout");

      const markup = renderToStaticMarkup(
        <RootLayout params={Promise.resolve({})}>
          <p>Page content</p>
        </RootLayout>,
      );

      expect(markup).toContain('data-banner="mounted"');
      // After the footer: last in the document, and so last in the tab
      // order, with nothing trapped behind it.
      expect(markup.indexOf('data-banner="mounted"')).toBeGreaterThan(
        markup.indexOf("</footer>"),
      );
    } finally {
      vi.doUnmock("@/components/consent/ConsentBanner");
      vi.resetModules();
    }
  });

  it("mounts the analytics loader inside the provider, after the content", async () => {
    // Same trick as the banner above, for the same reason: the loader renders
    // nothing until consent is "accepted", so only a marker in its place can
    // show that the shell still mounts it — and that it is inside the
    // provider, where it can read the answer, and after `<main>`, where it
    // cannot hold up the first render (REQ-11).
    vi.resetModules();
    vi.doMock("@/components/analytics/Analytics", () => ({
      Analytics: () => <div data-analytics="mounted" />,
    }));

    try {
      const { default: RootLayout } = await import("./layout");

      const markup = renderToStaticMarkup(
        <RootLayout params={Promise.resolve({})}>
          <p>Page content</p>
        </RootLayout>,
      );

      expect(markup).toContain('data-analytics="mounted"');
      expect(markup.indexOf('data-analytics="mounted"')).toBeGreaterThan(
        markup.indexOf("</main>"),
      );
    } finally {
      vi.doUnmock("@/components/analytics/Analytics");
      vi.resetModules();
    }
  });

  it("loads no analytics into the exported HTML, where nobody has accepted", async () => {
    const markup = await renderLayoutMarkup();

    // The real loader, unmocked: with the answer at "unanswered" it renders
    // nothing, so the tag is not merely inert in the export — it is absent.
    expect(markup).not.toContain("googletagmanager");
    expect(markup).not.toContain("dataLayer");
    expect(markup).not.toContain("gtag");
  });
});
