import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SITE_NAME } from "@/config/site";
import { getAllTools } from "@/tools/registry";

import HomePage from "./page";

describe("HomePage", () => {
  it("renders the site name as the page heading", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: SITE_NAME }),
    ).toBeInTheDocument();
  });

  it("lists every registered tool, taken from the registry", () => {
    render(<HomePage />);

    for (const tool of getAllTools()) {
      expect(screen.getByText(tool.name)).toBeInTheDocument();
    }
  });

  it("shows a heading for each category that has tools", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Converters" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Generators & formatters",
      }),
    ).toBeInTheDocument();
  });
});
