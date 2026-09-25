import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("links to the tool directory, About & contact and the privacy policy", () => {
    render(<SiteFooter />);

    const nav = screen.getByRole("navigation", { name: "Footer" });

    expect(
      within(nav).getByRole("link", { name: "All tools" }),
    ).toHaveAttribute("href", "/");
    expect(
      within(nav).getByRole("link", { name: "About & contact" }),
    ).toHaveAttribute("href", "/about");
    expect(
      within(nav).getByRole("link", { name: "Privacy policy" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("states that nothing typed leaves the browser", () => {
    render(<SiteFooter />);

    expect(
      screen.getByText(/nothing you type ever leaves this device/i),
    ).toBeInTheDocument();
  });
});
