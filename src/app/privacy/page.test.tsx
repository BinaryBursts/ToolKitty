import { within } from "@testing-library/dom";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  CONTACT_EMAIL,
  CONTACT_MAILTO,
  OPERATOR_NAME,
  PRIVACY_LAST_UPDATED,
  SITE_NAME,
} from "@/config/site";

import PrivacyPage, { metadata } from "./page";

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

describe("PrivacyPage", () => {
  it("is headed 'Privacy policy'", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy policy" }),
    ).toBeInTheDocument();
  });

  it("says analytics is Google Analytics, loads only after you accept, and sets cookies then", () => {
    const { container } = render(<PrivacyPage />);
    const text = pageText(container);

    expect(text).toContain("Google Analytics 4");
    expect(text).toMatch(/only after you accept/i);
    expect(text).toMatch(/sets its own cookies at that point/i);
  });

  it("says page views only — never what a visitor typed or a tool produced", () => {
    const { container } = render(<PrivacyPage />);
    const text = pageText(container);

    expect(text).toMatch(/page views/i);
    expect(text).toMatch(/generated password/i);
    expect(text).toMatch(/pasted JSON/i);
  });

  it("says everything typed into a tool stays in the browser and is never sent to a server", () => {
    const { container } = render(<PrivacyPage />);
    const text = pageText(container);

    expect(text).toMatch(/runs entirely in your browser/i);
    expect(text).toMatch(/never sent to a server/i);
  });

  it("says the site has no accounts, no sign-in and collects no personal data of its own", () => {
    const { container } = render(<PrivacyPage />);
    const text = pageText(container);

    expect(text).toMatch(/no accounts/i);
    expect(text).toMatch(/no sign-in/i);
    expect(text).toMatch(/collects, stores and transmits no personal data/i);
  });

  it("names Google AdSense as a possible future addition that sets its own cookies", () => {
    const { container } = render(<PrivacyPage />);
    const text = pageText(container);

    expect(text).toContain("Google AdSense");
    expect(text).toMatch(/may in future place display advertising/i);
    expect(text).toMatch(/AdSense sets its own cookies/i);
    expect(text).toMatch(/not enabled today/i);
  });

  it("says declining loads nothing, sets no cookie and leaves every tool working", () => {
    const { container } = render(<PrivacyPage />);
    const text = pageText(container);

    expect(text).toMatch(/If you press Decline/i);
    expect(text).toMatch(/no cookie is set/i);
    expect(text).toMatch(/works in exactly the same way/i);
  });

  it("says the site sets no cookies of its own and that Google's are the only ones that can exist", () => {
    const { container } = render(<PrivacyPage />);
    const text = pageText(container);

    expect(text).toMatch(/sets no cookies of its own/i);
    expect(text).toMatch(/under Google.{0,3}s own retention/i);
  });

  it("shows a last-updated date, taken from the shared constant", () => {
    const { container } = render(<PrivacyPage />);

    expect(pageText(container)).toMatch(/Last updated 14 September 2026/);

    const time = container.querySelector("time");
    expect(time).not.toBeNull();
    expect(time).toHaveAttribute("datetime", PRIVACY_LAST_UPDATED);
  });

  it("shows the contact address as a mailto link, from the shared constant", () => {
    render(<PrivacyPage />);

    const mailLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === CONTACT_MAILTO);

    // Once in the policy text and once in the sidebar card.
    expect(mailLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of mailLinks) {
      expect(link.textContent).toContain(CONTACT_EMAIL);
    }
    expect(CONTACT_MAILTO).toBe(`mailto:${CONTACT_EMAIL}`);
  });

  it("names who runs the site and links to the About page", () => {
    const { container } = render(<PrivacyPage />);

    expect(pageText(container)).toContain(OPERATOR_NAME);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/about"),
    ).toBe(true);
  });

  it("holds no form, input, textarea or select — the site has no server to receive one", () => {
    const { container } = render(<PrivacyPage />);

    expect(container.querySelector("form, input, textarea, select")).toBeNull();
    // Nor a button: a control on a static policy page would do nothing.
    expect(container.querySelector("button")).toBeNull();
  });

  it("lists every third party that can load, with when it loads and whether it sets cookies", () => {
    const { container } = render(<PrivacyPage />);
    const table = container.querySelector("table");

    expect(table).not.toBeNull();
    const rows = within(table!).getAllByRole("row");
    // Header row plus Google Analytics, Google AdSense and everything else.
    expect(rows).toHaveLength(4);

    const tableText = pageText(table as HTMLElement);
    expect(tableText).toContain("Google Analytics 4");
    expect(tableText).toContain("Google AdSense");
    expect(tableText).toMatch(/Only after Accept/);
    expect(tableText).toMatch(/Not enabled yet/);
  });

  it("gives every 'On this page' link a heading on the page to land on", () => {
    const { container } = render(<PrivacyPage />);

    const contents = within(container).getByRole("navigation", {
      name: "On this page",
    });
    const links = within(contents).getAllByRole("link");

    expect(links.length).toBeGreaterThan(5);
    for (const link of links) {
      const id = (link.getAttribute("href") ?? "").replace("#", "");
      const target = container.querySelector(`#${id}`);

      expect(target, `no section with id "${id}"`).not.toBeNull();
      expect(target!.tagName).toBe("H2");
    }
  });
});

describe("PrivacyPage metadata", () => {
  it("titles the page 'Privacy policy — ToolKitty', without the layout's template", () => {
    expect(metadata.title).toEqual({
      absolute: `Privacy policy — ${SITE_NAME}`,
    });
  });

  it("carries a one-sentence description and stays indexable", () => {
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description ?? "").length).toBeGreaterThan(40);
    // No robots directive at all: the policy is meant to be found.
    expect(metadata.robots).toBeUndefined();
  });
});

describe("the privacy page inside the site shell", () => {
  const renderWholePage = async (): Promise<Document> => {
    const { default: RootLayout } = await import("../layout");

    const markup = renderToStaticMarkup(
      <RootLayout params={Promise.resolve({})}>
        <PrivacyPage />
      </RootLayout>,
    );

    document.open();
    document.write(`<!DOCTYPE html>${markup}`);
    document.close();

    return document;
  };

  it("renders inside the shared header and footer, and is reachable from the footer link", async () => {
    const doc = await renderWholePage();

    expect(doc.querySelector("header.o-topbar")).not.toBeNull();

    const footer = doc.querySelector<HTMLElement>("footer.o-footer");
    expect(footer).not.toBeNull();
    expect(
      within(footer!).getByRole("link", { name: "Privacy policy" }),
    ).toHaveAttribute("href", "/privacy");

    const main = doc.querySelector<HTMLElement>("main#content");
    expect(main).not.toBeNull();
    expect(
      within(main!).getByRole("heading", { level: 1, name: "Privacy policy" }),
    ).toBeInTheDocument();
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
