import { within } from "@testing-library/dom";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SITE_NAME } from "@/config/site";
import { getAllTools } from "@/tools/registry";

import NotFound, { metadata } from "./not-found";

// The root layout is rendered at the foot of this file to check the page sits
// inside the shared header and footer. `next/font/google` only exists inside
// the Next compiler and globals.css is a Tailwind entry point, so both are
// stubbed the way `src/app/layout.test.tsx` stubs them.
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
vi.mock("./globals.css", () => ({}));

/** Every href the page renders, in document order. */
const renderedHrefs = (): string[] =>
  screen.getAllByRole("link").map((link) => link.getAttribute("href") ?? "");

describe("NotFound", () => {
  it("says plainly that the page does not exist", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "That page does not exist",
      }),
    ).toBeInTheDocument();
  });

  it("links back to the homepage directory", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("link", { name: /Back to all tools/ }),
    ).toHaveAttribute("href", "/");

    // Not just the primary button: the page must offer a route home even to a
    // visitor who has read past it.
    expect(
      renderedHrefs().filter((href) => href === "/").length,
    ).toBeGreaterThan(1);
  });

  it("links to every registered tool, taken from the registry", () => {
    render(<NotFound />);

    for (const tool of getAllTools()) {
      const links = screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("href") === `/tools/${tool.slug}`);

      expect(links.length).toBeGreaterThan(0);
    }
  });

  it("names every registered tool", () => {
    render(<NotFound />);

    for (const tool of getAllTools()) {
      expect(screen.getAllByText(tool.name).length).toBeGreaterThan(0);
    }
  });

  it("offers the ways on the approved screen draws — suggest a tool, privacy policy", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("link", { name: "Suggest a tool" }),
    ).toHaveAttribute("href", "/about");
    expect(
      screen.getByRole("link", { name: "Read the privacy policy" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("holds no form control, so nothing on it can fail without JavaScript", () => {
    const { container } = render(<NotFound />);

    // The approved screen draws a search box here; search lives on the
    // homepage (REQ-4), and a box that filtered nothing would be a lie.
    expect(container.querySelector("input, button")).toBeNull();
  });
});

describe("NotFound metadata", () => {
  it("titles the page 'Page not found — ToolKitty', without the layout's template", () => {
    expect(metadata.title).toEqual({
      absolute: `Page not found — ${SITE_NAME}`,
    });
  });

  it("tells crawlers not to index it", () => {
    // There is no server to send a 404 status with the static file, so the
    // robots directive is what keeps a wrong address out of search results.
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});

describe("the not-found page inside the site shell", () => {
  const renderWholePage = async (): Promise<Document> => {
    const { default: RootLayout } = await import("./layout");

    const markup = renderToStaticMarkup(
      <RootLayout params={Promise.resolve({})}>
        <NotFound />
      </RootLayout>,
    );

    document.open();
    document.write(`<!DOCTYPE html>${markup}`);
    document.close();

    return document;
  };

  it("renders inside the shared header and footer", async () => {
    const doc = await renderWholePage();

    const header = doc.querySelector<HTMLElement>("header.o-topbar");
    const footer = doc.querySelector<HTMLElement>("footer.o-footer");

    expect(header).not.toBeNull();
    expect(footer).not.toBeNull();

    const main = doc.querySelector<HTMLElement>("main#content");
    expect(main).not.toBeNull();
    expect(
      within(main!).getByRole("heading", {
        level: 1,
        name: "That page does not exist",
      }),
    ).toBeInTheDocument();
  });
});
