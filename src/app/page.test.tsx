import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SITE_NAME } from "@/config/site";

import HomePage from "./page";

describe("HomePage", () => {
  it("renders the site name as the page heading", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: SITE_NAME }),
    ).toBeInTheDocument();
  });
});
