import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getToolListings } from "@/tools/registry";

import { NO_RESULTS_MESSAGE, ToolDirectory } from "./ToolDirectory";

const TOOLS = getToolListings();

/** The directory as the homepage renders it, featured row and all. */
function renderDirectory() {
  return render(
    <ToolDirectory
      tools={TOOLS}
      featured={<div data-testid="featured">Featured tools</div>}
    />,
  );
}

/** The search box, found the way a visitor finds it: by its label. */
const searchBox = (): HTMLElement => screen.getByLabelText("Search tools");

/** Type into the search box, as the visitor would. */
function type(text: string) {
  fireEvent.change(searchBox(), { target: { value: text } });
}

/** The names of the tools currently listed, in the order they appear. */
const listedTools = (): string[] =>
  screen
    .getAllByRole("link")
    .map((link) => within(link).getByRole("heading").textContent ?? "");

describe("ToolDirectory", () => {
  it("lists every tool under its category heading before anything is typed", () => {
    renderDirectory();

    expect(listedTools()).toEqual([
      "Weight Converter",
      "Temperature Converter",
      "Password Generator",
      "JSON Formatter",
    ]);

    expect(
      screen.getByRole("heading", { name: "Converters" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Generators & formatters" }),
    ).toBeInTheDocument();

    for (const tool of TOOLS) {
      expect(screen.getByText(`/tools/${tool.slug}`)).toBeInTheDocument();
    }
  });

  it("starts with an empty search box, so the static listing is the full one", () => {
    renderDirectory();

    expect(searchBox()).toHaveValue("");
    expect(searchBox()).toHaveAttribute("type", "search");
  });

  it("leaves only the temperature converter when 'temp' is typed", () => {
    renderDirectory();

    type("temp");

    expect(listedTools()).toEqual(["Temperature Converter"]);
    expect(
      screen.getByRole("heading", { name: "Converters" }),
    ).toBeInTheDocument();
    // The category with nothing matching in it is gone entirely.
    expect(
      screen.queryByRole("heading", { name: "Generators & formatters" }),
    ).not.toBeInTheDocument();
  });

  it("restores all four tools when the box is cleared", () => {
    renderDirectory();

    type("temp");
    expect(listedTools()).toHaveLength(1);

    type("");

    expect(listedTools()).toHaveLength(4);
    expect(
      screen.getByRole("heading", { name: "Generators & formatters" }),
    ).toBeInTheDocument();
  });

  it("matches case-insensitively and ignores surrounding whitespace", () => {
    renderDirectory();

    type(" TEMP ");

    expect(listedTools()).toEqual(["Temperature Converter"]);
  });

  it("matches on a keyword that is in neither the name nor the description", () => {
    const tool = TOOLS.find((entry) => entry.slug === "temperature-converter");
    expect(tool?.keywords).toContain("oven");
    expect(tool?.name.toLowerCase()).not.toContain("oven");
    expect(tool?.shortDescription.toLowerCase()).not.toContain("oven");

    renderDirectory();

    type("oven");

    expect(listedTools()).toEqual(["Temperature Converter"]);
  });

  it("shows the no-results message and a clear link when nothing matches", () => {
    renderDirectory();

    type("zzz");

    expect(screen.getByText(NO_RESULTS_MESSAGE)).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(screen.queryByText(NO_RESULTS_MESSAGE)).not.toBeInTheDocument();
    expect(searchBox()).toHaveValue("");
    expect(listedTools()).toHaveLength(4);
  });

  it("clears the box from the control inside the field", () => {
    renderDirectory();

    type("temp");
    fireEvent.click(
      screen.getByRole("button", { name: "Clear the search box" }),
    );

    expect(searchBox()).toHaveValue("");
    expect(listedTools()).toHaveLength(4);
  });

  it("offers no clear control while the box is empty", () => {
    renderDirectory();

    expect(
      screen.queryByRole("button", { name: "Clear the search box" }),
    ).not.toBeInTheDocument();
  });

  it("announces the result count in a polite live region as the query changes", () => {
    const { container } = renderDirectory();

    const status = container.querySelector('[role="status"]');
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("4 tools");

    type("convert");
    expect(status).toHaveTextContent("2 tools match");

    type("temp");
    expect(status).toHaveTextContent("1 tool matches");

    type("zzz");
    expect(status).toHaveTextContent("No tools match");

    type("");
    expect(status).toHaveTextContent("4 tools");
  });

  it("hides the featured row while a search is active and brings it back after", () => {
    renderDirectory();

    expect(screen.getByTestId("featured")).toBeInTheDocument();

    type("temp");
    expect(screen.queryByTestId("featured")).not.toBeInTheDocument();

    type("");
    expect(screen.getByTestId("featured")).toBeInTheDocument();
  });

  it("neither touches the URL nor writes anything to storage as the visitor types", () => {
    const url = window.location.href;

    renderDirectory();

    type("temp");
    type("zzz");

    expect(window.location.href).toBe(url);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.cookie).toBe("");
  });
});
