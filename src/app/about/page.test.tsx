import { within } from "@testing-library/dom";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CONTACT_EMAIL, CONTACT_MAILTO, OPERATOR_NAME } from "@/config/site";
import { getToolListings } from "@/tools/registry";

import PrivacyPage from "../privacy/page";

import AboutPage, { metadata } from "./page";

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
vi.mock("../globals.css", () => ({}));

/** The whole page as one string of text, with runs of whitespace collapsed. */
const pageText = (container: HTMLElement): string =>
  (container.textContent ?? "").replace(/\s+/g, " ");

describe("AboutPage", () => {
  it("is headed with what the site is", () => {
    render(<AboutPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /small tools that never phone home/i,
      }),
    ).toBeInTheDocument();
  });

  it("says what ToolKitty is: small, free tools that run in the browser", () => {
    const { container } = render(<AboutPage />);
    const text = pageText(container);

    expect(text).toMatch(/everyday utilities/i);
    expect(text).toMatch(/the work happens on your device/i);
    expect(text).toMatch(/Free, with no limits and no paid tier/i);
  });

  it("says how it works: no accounts, no uploads, analytics only after you accept", () => {
    const { container } = render(<AboutPage />);
    const text = pageText(container);

    expect(text).toMatch(/no accounts to create/i);
    expect(text).toMatch(/nothing is uploaded/i);
    expect(text).toMatch(/analytics load only if you accept/i);
  });

  it("names who runs the site, from the shared constant", () => {
    const { container } = render(<AboutPage />);

    expect(pageText(container)).toContain(OPERATOR_NAME);
    expect(
      screen.getByRole("heading", { level: 2, name: "What this site is" }),
    ).toBeInTheDocument();
  });

  it("shows the contact address as a mailto link, from the shared constant", () => {
    render(<AboutPage />);

    const mailLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === CONTACT_MAILTO);

    // Once in the hero and once in the contact card.
    expect(mailLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of mailLinks) {
      expect(link.textContent).toContain(CONTACT_EMAIL);
    }
    expect(CONTACT_MAILTO).toBe(`mailto:${CONTACT_EMAIL}`);
  });

  it("says there is no contact form, and why", () => {
    const { container } = render(<AboutPage />);

    expect(pageText(container)).toMatch(
      /There is no contact form — a form would need a server/i,
    );
  });

  it("links to the privacy policy for the detail of analytics and advertising", () => {
    const { container } = render(<AboutPage />);

    const privacyLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === "/privacy");

    expect(privacyLinks.length).toBeGreaterThanOrEqual(1);
    expect(pageText(container)).toMatch(
      /analytics, advertising or cookies\? The privacy policy/i,
    );
  });

  it("counts the tools from the registry rather than a number typed into the copy", () => {
    const { container } = render(<AboutPage />);
    const text = pageText(container);
    const tools = getToolListings();

    // Four tools today, so the copy reads "four" — and would read "five" the
    // day a fifth entry lands in the registry.
    expect(tools).toHaveLength(4);
    expect(text).toContain("Four small tools that never phone home.");
    expect(text).toContain("The four tools today");
    expect(text).toContain(`${tools.length} tools, 1 promise`);

    // Every registered tool is linked from the page.
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    for (const tool of tools) {
      expect(hrefs).toContain(`/tools/${tool.slug}`);
    }
  });

  it("holds no form, input, textarea or select — the site has no server to receive one", () => {
    const { container } = render(<AboutPage />);

    expect(container.querySelector("form, input, textarea, select")).toBeNull();
    // Nor a button: a control on a static information page would do nothing.
    expect(container.querySelector("button")).toBeNull();
  });

  /*
   * A guard for the 320 px criterion, and only a guard: jsdom does no layout,
   * so this cannot measure a scrollbar. What it can do is catch the two ways
   * a page in this codebase has any business overflowing — a width or a
   * min-width pinned in pixels in the page's own markup, and the one long
   * unbreakable token on the page (the email address) left unable to wrap.
   * Everything else is the shell's fluid `.o-container` and `.o-grid`, which
   * are already one column below 641 px. The real check stays the manual pass
   * at 320 px in both colour schemes.
   */
  it("pins no width in pixels and lets the email address wrap", () => {
    const { container } = render(<AboutPage />);

    for (const element of container.querySelectorAll<HTMLElement>("[style]")) {
      const { width, minWidth } = element.style;

      expect([width, minWidth].join(" ")).not.toMatch(/\d\s*px/);
    }

    const mailLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === CONTACT_MAILTO);

    for (const link of mailLinks) {
      expect(link.style.overflowWrap).toBe("anywhere");
    }
  });

  it("adds no page-specific stylesheet or inline style block", () => {
    const { container } = render(<AboutPage />);

    expect(container.querySelector("style, link[rel='stylesheet']")).toBeNull();
  });

  /*
   * The owner settled where advertising may be reserved: tool pages only. That
   * matches what the privacy policy already tells visitors — ads appear "in
   * the reserved space below a tool" — so a reserve on an information page
   * would make the policy wrong the day ads are switched on. The approved
   * screen draws one here; this test is what stops it coming back without the
   * policy being revised with it.
   */
  it("reserves no advertising space — that belongs to tool pages only", () => {
    const { container } = render(<AboutPage />);

    expect(container.querySelector(".t-reserve")).toBeNull();
    expect(container.querySelector("[data-ad-slot]")).toBeNull();
  });
});

describe("AboutPage metadata", () => {
  it("titles the page 'About ToolKitty', without the layout's template", () => {
    expect(metadata.title).toEqual({ absolute: "About ToolKitty" });
  });

  it("carries a one-sentence description", () => {
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description ?? "").length).toBeGreaterThan(40);
  });
});

describe("the About and privacy pages together", () => {
  it("publish the same contact email address", () => {
    const about = render(<AboutPage />);
    const aboutText = pageText(about.container);
    about.unmount();

    const privacy = render(<PrivacyPage />);
    const privacyText = pageText(privacy.container);

    expect(aboutText).toContain(CONTACT_EMAIL);
    expect(privacyText).toContain(CONTACT_EMAIL);
  });

  it("neither of them holds a form, input, textarea or select", () => {
    for (const Page of [AboutPage, PrivacyPage]) {
      const { container, unmount } = render(<Page />);

      expect(
        container.querySelector("form, input, textarea, select"),
      ).toBeNull();
      unmount();
    }
  });
});

describe("the About page inside the site shell", () => {
  const renderWholePage = async (): Promise<Document> => {
    const { default: RootLayout } = await import("../layout");

    const markup = renderToStaticMarkup(
      <RootLayout params={Promise.resolve({})}>
        <AboutPage />
      </RootLayout>,
    );

    document.open();
    document.write(`<!DOCTYPE html>${markup}`);
    document.close();

    return document;
  };

  it("renders inside the shared header and footer", async () => {
    const doc = await renderWholePage();

    expect(doc.querySelector("header.o-topbar")).not.toBeNull();
    expect(doc.querySelector("footer.o-footer")).not.toBeNull();

    const main = doc.querySelector<HTMLElement>("main#content");
    expect(main).not.toBeNull();
    expect(
      within(main!).getByRole("heading", {
        level: 1,
        name: /never phone home/i,
      }),
    ).toBeInTheDocument();
  });

  it("is reachable from the header and both footer links around it", async () => {
    const doc = await renderWholePage();

    const header = doc.querySelector<HTMLElement>("header.o-topbar");
    const footer = doc.querySelector<HTMLElement>("footer.o-footer");

    expect(
      within(header!).getAllByRole("link", { name: "About" })[0],
    ).toHaveAttribute("href", "/about");
    expect(
      within(footer!).getByRole("link", { name: "About & contact" }),
    ).toHaveAttribute("href", "/about");
    expect(
      within(footer!).getByRole("link", { name: "Privacy policy" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("puts no form control anywhere on the rendered page", async () => {
    const doc = await renderWholePage();

    expect(
      doc.querySelector("main#content form, main#content input"),
    ).toBeNull();
    expect(
      doc.querySelector("main#content textarea, main#content select"),
    ).toBeNull();
  });
});
