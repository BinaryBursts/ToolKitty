import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdReserve } from "./AdReserve";

describe("AdReserve", () => {
  it("renders an empty block with the reserved-height class", () => {
    const { container } = render(<AdReserve />);

    const block = container.firstElementChild;

    expect(block).toHaveClass("t-reserve");
    expect(block?.textContent).toBe("");
    expect(block?.children).toHaveLength(0);
  });

  it("loads no ad script and contacts nobody", () => {
    const { container } = render(<AdReserve />);

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.innerHTML).not.toMatch(/adsbygoogle|googlesyndication/i);
  });

  it("is hidden from assistive technology, having nothing to announce", () => {
    const { container } = render(<AdReserve />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps its own class when given another", () => {
    const { container } = render(<AdReserve className="extra" />);

    expect(container.firstElementChild).toHaveClass("t-reserve", "extra");
  });
});
