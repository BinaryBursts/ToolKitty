import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { toolPath } from "@/lib/urls";
import { getAllTools } from "@/tools/registry";
import type { ToolDefinition } from "@/tools/types";

import { ToolPageTemplate, TOOL_PAGE_SECTIONS } from "./ToolPageTemplate";

/** A stand-in tool, so the template is tested without any real tool's markup. */
function StubTool() {
  return <p>Stub tool body</p>;
}

const stubEntry: ToolDefinition = {
  slug: "stub-tool",
  name: "Stub Tool",
  shortDescription: "A tool that exists only in this test.",
  category: "converters",
  keywords: ["stub"],
  seoTitle: "Stub Tool — a tool for tests | ToolKitty",
  metaDescription: "A tool that exists only in this test.",
  featured: false,
  component: StubTool,
  supportingCopy: ["First paragraph of copy.", "Second paragraph of copy."],
};

const sectionOrder = (container: HTMLElement): string[] =>
  [...container.querySelectorAll("[data-section]")].map(
    (section) => section.getAttribute("data-section") ?? "",
  );

describe("ToolPageTemplate", () => {
  it("lays every tool page out in the same order", () => {
    const { container } = render(<ToolPageTemplate tool={stubEntry} />);

    expect(sectionOrder(container)).toEqual([...TOOL_PAGE_SECTIONS]);
  });

  it("renders the same order for a real registry entry", () => {
    const [firstTool] = getAllTools();
    const { container } = render(<ToolPageTemplate tool={firstTool!} />);

    expect(sectionOrder(container)).toEqual([...TOOL_PAGE_SECTIONS]);
  });

  it("heads the page with the tool's name and short description", () => {
    render(<ToolPageTemplate tool={stubEntry} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Stub Tool" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A tool that exists only in this test."),
    ).toBeInTheDocument();
  });

  it("puts a breadcrumb back to the directory and the tool's category", () => {
    render(<ToolPageTemplate tool={stubEntry} />);

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });

    expect(breadcrumb).toHaveTextContent("All tools");
    expect(breadcrumb).toHaveTextContent("Converters");
    expect(screen.getByRole("link", { name: "All tools" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders the tool component from the registry entry", () => {
    render(<ToolPageTemplate tool={stubEntry} />);

    expect(screen.getByText("Stub tool body")).toBeInTheDocument();
  });

  it("shows the privacy notice on the page, above the tool", () => {
    const { container } = render(<ToolPageTemplate tool={stubEntry} />);

    const notice = container.querySelector(".t-privacy");
    const tool = container.querySelector('[data-section="tool"]');

    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain(
      "Everything you type into this tool stays in your browser",
    );
    expect(notice?.textContent).toContain("never sent to a server");
    expect(notice?.textContent).toContain("anonymous page analytics");
    expect(
      screen.getByRole("link", { name: "How we handle data" }),
    ).toHaveAttribute("href", "/privacy");
    expect(
      notice!.compareDocumentPosition(tool!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders the entry's supporting copy, one paragraph each", () => {
    const { container } = render(<ToolPageTemplate tool={stubEntry} />);

    const copy = container.querySelector('[data-section="supporting-copy"]');

    expect(copy?.querySelector("h2")?.textContent).toBe("About Stub Tool");
    expect(
      [...(copy?.querySelectorAll("p") ?? [])].map((p) => p.textContent),
    ).toEqual(["First paragraph of copy.", "Second paragraph of copy."]);
  });

  it("links on to every other registered tool, and not to itself", () => {
    const { container } = render(<ToolPageTemplate tool={stubEntry} />);

    const moreTools = container.querySelector('[data-section="more-tools"]');
    const hrefs = [...(moreTools?.querySelectorAll("a.t-tool") ?? [])].map(
      (a) => a.getAttribute("href"),
    );

    expect(hrefs).toEqual(getAllTools().map((tool) => toolPath(tool.slug)));
    expect(hrefs).not.toContain(toolPath(stubEntry.slug));
  });

  it("leaves the tool being read out of its own more-tools list", () => {
    const [firstTool] = getAllTools();
    const { container } = render(<ToolPageTemplate tool={firstTool!} />);

    const hrefs = [
      ...container.querySelectorAll('[data-section="more-tools"] a.t-tool'),
    ].map((a) => a.getAttribute("href"));

    expect(hrefs).not.toContain(toolPath(firstTool!.slug));
    expect(hrefs).toHaveLength(getAllTools().length - 1);
  });

  it("reserves the ad space empty, with no script and no placeholder text", () => {
    const { container } = render(<ToolPageTemplate tool={stubEntry} />);

    const reserve = container.querySelector(".t-reserve");

    expect(reserve).not.toBeNull();
    expect(reserve?.textContent).toBe("");
    expect(reserve?.children).toHaveLength(0);
    expect(container.querySelector("script")).toBeNull();
  });
});
