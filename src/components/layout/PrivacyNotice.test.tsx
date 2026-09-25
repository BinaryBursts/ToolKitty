import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ToolDefinition } from "@/tools/types";

import { PrivacyNotice } from "./PrivacyNotice";
import { ToolPageTemplate } from "./ToolPageTemplate";

/**
 * The notice is the one piece of a tool page that has to be believed (REQ-9),
 * so it is pinned down twice here: the component's own wording, and the fact
 * that the shared template renders it for a registry entry it has never seen,
 * above the tool, with nothing a tool could set to turn it off.
 */

/** The whole notice, with the markup taken out, as a visitor reads it. */
const noticeText = (container: HTMLElement): string =>
  (container.querySelector(".t-privacy")?.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim();

describe("PrivacyNotice", () => {
  it("says, first, that what is typed stays in the browser", () => {
    const { container } = render(<PrivacyNotice />);

    expect(noticeText(container)).toMatch(
      /^Everything you type into this tool stays in your browser\./,
    );
    expect(noticeText(container)).toContain("never sent to a server");
    expect(noticeText(container)).toContain(
      "no uploads, no accounts, nothing stored",
    );
  });

  it("also says the site itself uses analytics and advertising, which set cookies", () => {
    const { container } = render(<PrivacyNotice />);

    expect(noticeText(container)).toContain("anonymous page analytics");
    expect(noticeText(container)).toContain("only if you accept");
    expect(noticeText(container)).toContain("advertising");
    expect(noticeText(container)).toContain("set their own cookies");
  });

  it("links to the privacy policy", () => {
    render(<PrivacyNotice />);

    expect(
      screen.getByRole("link", { name: "How we handle data" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("is text, not a picture of text", () => {
    const { container } = render(<PrivacyNotice />);

    // The padlock is decorative and hidden; everything that carries meaning is
    // in the text content, so it is indexable and read out in reading order.
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(noticeText(container).length).toBeGreaterThan(200);
  });

  it("takes no props, so nothing can be passed to hide or soften it", () => {
    // A component with no parameters cannot be given a `hidden`, a `variant`
    // or a `className` by one tool and not another (REQ-9, AC6).
    expect(PrivacyNotice).toHaveLength(0);
  });
});

/**
 * A throwaway tool nobody has registered: if the notice reaches its page with
 * no extra markup, then registering a real tool inherits the notice too.
 */
function FixtureTool() {
  return (
    <form>
      <label htmlFor="fixture-input">First control</label>
      <input id="fixture-input" />
    </form>
  );
}

const fixtureEntry: ToolDefinition = {
  slug: "fixture-tool",
  name: "Fixture Tool",
  shortDescription: "A tool that exists only in this test.",
  category: "converters",
  keywords: ["fixture"],
  seoTitle: "Fixture Tool — a tool for tests | ToolKitty",
  metaDescription: "A tool that exists only in this test.",
  featured: false,
  component: FixtureTool,
  supportingCopy: ["Something about the fixture tool."],
};

describe("a newly registered tool's page", () => {
  it("carries the notice without the tool doing anything", () => {
    const { container } = render(<ToolPageTemplate tool={fixtureEntry} />);

    expect(noticeText(container)).toContain(
      "Everything you type into this tool stays in your browser.",
    );
    expect(
      screen.getByRole("link", { name: "How we handle data" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("puts the notice before the tool's first control in reading order", () => {
    const { container } = render(<ToolPageTemplate tool={fixtureEntry} />);

    const notice = container.querySelector(".t-privacy");
    const firstControl = screen.getByLabelText("First control");

    expect(notice).not.toBeNull();
    expect(
      notice!.compareDocumentPosition(firstControl) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders exactly one notice, from the template and not from the tool", () => {
    const { container } = render(<ToolPageTemplate tool={fixtureEntry} />);

    expect(container.querySelectorAll(".t-privacy")).toHaveLength(1);
  });
});
