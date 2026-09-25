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

  // Not a design assertion — this is what proves the page reads the registry,
  // which is what makes a bad registry fail the build (REQ-2).
  it("names every registered tool, taken from the registry", () => {
    render(<HomePage />);

    for (const tool of getAllTools()) {
      expect(screen.getByText(tool.name, { exact: false })).toBeInTheDocument();
    }
  });
});
