import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SwapButton } from "./SwapButton";

describe("SwapButton", () => {
  it("is an icon button with an accessible name", () => {
    render(<SwapButton />);

    const button = screen.getByRole("button", { name: "Swap units" });

    expect(button).toHaveClass("t-swap");
    expect(button).toHaveAttribute("type", "button");
  });

  it("takes a name of its own", () => {
    render(<SwapButton label="Swap input and output" />);

    expect(
      screen.getByRole("button", { name: "Swap input and output" }),
    ).toBeInTheDocument();
  });

  it("calls its handler", () => {
    const onClick = vi.fn();
    render(<SwapButton onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Swap units" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("can draw the rules either side, as the converters do", () => {
    const { container } = render(<SwapButton withRules />);

    expect(container.querySelector(".t-swapwrap")).not.toBeNull();
    expect(container.querySelectorAll(".t-swapline")).toHaveLength(2);
  });

  it("hides its icon from assistive technology", () => {
    const { container } = render(<SwapButton />);

    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
