import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FOOTER_NAV } from "@/components/layout/SiteFooter";
import { PRIMARY_NAV } from "@/components/layout/SiteHeader";

import KitchenSinkPage, { metadata } from "./page";

const KITCHEN_SINK_PATH = "/kitchen-sink";

describe("kitchen sink route", () => {
  it("renders every component of the kit", () => {
    render(<KitchenSinkPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "UI kit kitchen sink" }),
    ).toBeInTheDocument();

    // Buttons, in all four weights and all three sizes.
    expect(screen.getByRole("button", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Danger" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Small" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Primary disabled" }),
    ).toBeDisabled();

    // Fields: text, select, textarea, slider — and a field in its error state.
    expect(screen.getAllByLabelText("Amount to convert")).toHaveLength(2);
    expect(
      screen.getByText("Enter a number — letters cannot be converted."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Category").tagName).toBe("SELECT");
    expect(screen.getByLabelText("JSON to format").tagName).toBe("TEXTAREA");
    expect(
      screen.getByRole("slider", { name: "Password length" }),
    ).toBeInTheDocument();

    // Segmented selectors: from, to and stacked.
    expect(
      screen.getByRole("radiogroup", { name: "Convert from" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: "Convert to" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: "Indentation" }),
    ).toBeInTheDocument();

    // Swap, readouts and copy controls.
    expect(screen.getAllByRole("button", { name: "Swap units" })).toHaveLength(
      2,
    );
    expect(
      screen.getByText("1234567890123456789012345678901234567890"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Copy result/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Copy password/ }),
    ).toBeInTheDocument();

    // Inline messages: info, error, empty.
    expect(screen.getByRole("alert")).toHaveTextContent(
      "That temperature is impossible",
    );
    expect(screen.getByText("No tools match that search")).toBeInTheDocument();
  });

  it("is kept out of the site's navigation", () => {
    const hrefs = [
      ...PRIMARY_NAV.map((item) => item.href),
      ...FOOTER_NAV.map((item) => item.href),
    ];

    expect(hrefs).not.toContain(KITCHEN_SINK_PATH);
  });

  it("asks crawlers to leave it out, since a static export cannot hide it", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
