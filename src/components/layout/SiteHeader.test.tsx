import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SITE_NAME } from "@/config/site";

import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("shows the wordmark linking home", () => {
    render(<SiteHeader />);

    const brand = screen.getByRole("link", { name: SITE_NAME });

    expect(brand).toHaveAttribute("href", "/");
  });

  it("shows Tools and About in both the wide and the compact navigation", () => {
    render(<SiteHeader />);

    // Both navigations are in the markup; CSS shows exactly one at a time.
    const navs = screen.getAllByRole("navigation", { name: "Main" });
    expect(navs).toHaveLength(2);

    for (const nav of navs) {
      expect(within(nav).getByRole("link", { name: "Tools" })).toHaveAttribute(
        "href",
        "/",
      );
      expect(within(nav).getByRole("link", { name: "About" })).toHaveAttribute(
        "href",
        "/about",
      );
    }
  });

  it("collapses into a keyboard-operable disclosure, closed to begin with", () => {
    const { container } = render(<SiteHeader />);

    const details = container.querySelector("details.o-menu");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");

    // A native <summary> is focusable and toggles on Enter/Space without any
    // script, which is what keeps the compact menu usable by keyboard.
    expect(screen.getByLabelText("Menu").tagName).toBe("SUMMARY");
  });
});
