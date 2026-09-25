import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getAllTools, getFeaturedTools } from "@/tools/registry";

import HomePage from "./page";

describe("HomePage", () => {
  it("opens with the hero's own heading", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Small tools that run on your side of the wire.",
      }),
    ).toBeInTheDocument();
  });

  // Not a design assertion — this is what proves the page reads the registry,
  // which is what makes a bad registry fail the build (REQ-2).
  it("names every registered tool, taken from the registry", () => {
    render(<HomePage />);

    for (const tool of getAllTools()) {
      expect(screen.getAllByText(tool.name).length).toBeGreaterThan(0);
    }
  });

  it("links every tool to its own page", () => {
    render(<HomePage />);

    for (const tool of getAllTools()) {
      const links = screen
        .getAllByRole("link")
        .filter(
          (link) => link.getAttribute("href") === `/tools/${tool.slug}`,
        );

      expect(links.length).toBeGreaterThan(0);
    }
  });

  it("filters the listing as the visitor types, and restores it when cleared", () => {
    render(<HomePage />);

    const search = screen.getByLabelText("Search tools");

    fireEvent.change(search, { target: { value: "temp" } });

    expect(screen.getAllByText("Temperature Converter").length).toBe(1);
    expect(screen.queryByText("Password Generator")).not.toBeInTheDocument();
    // The featured row is out of the way while a search is running, so what
    // is left on screen is the filtered listing and nothing else.
    expect(
      screen.queryByRole("heading", { name: "Start here" }),
    ).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "" } });

    expect(screen.getAllByText("Password Generator").length).toBe(2);
    expect(
      screen.getByRole("heading", { name: "Start here" }),
    ).toBeInTheDocument();
    expect(getFeaturedTools().length).toBeGreaterThan(0);
  });
});
