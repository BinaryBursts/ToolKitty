import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button, type ButtonVariant } from "./Button";

describe("Button", () => {
  it.each<[ButtonVariant, string]>([
    ["primary", "o-btn--primary"],
    ["secondary", "o-btn--secondary"],
    ["ghost", "o-btn--ghost"],
    ["danger", "o-btn--danger"],
  ])("renders the %s variant as %s", (variant, expected) => {
    render(<Button variant={variant}>Convert</Button>);

    const button = screen.getByRole("button", { name: "Convert" });

    expect(button).toHaveClass("o-btn");
    expect(button).toHaveClass(expected);
  });

  it("maps the three sizes, leaving medium unmodified", () => {
    const { rerender } = render(<Button size="sm">Reset</Button>);
    expect(screen.getByRole("button")).toHaveClass("o-btn--sm");

    rerender(<Button size="md">Reset</Button>);
    expect(screen.getByRole("button").className).toBe("o-btn o-btn--secondary");

    rerender(<Button size="lg">Reset</Button>);
    expect(screen.getByRole("button")).toHaveClass("o-btn--lg");
  });

  it("defaults to type=button so a tool never submits or reloads", () => {
    render(<Button>Generate</Button>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("calls its handler, and does not when disabled", () => {
    const onClick = vi.fn();

    const { rerender } = render(<Button onClick={onClick}>Generate</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Generate
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("supports the full-width and icon-only shapes", () => {
    const { rerender } = render(<Button block>Copy</Button>);
    expect(screen.getByRole("button")).toHaveClass("o-btn--block");

    rerender(<Button iconOnly aria-label="Open menu" />);
    const icon = screen.getByRole("button", { name: "Open menu" });
    expect(icon).toHaveClass("o-btn--icon");
  });

  it("keeps classes a caller adds", () => {
    render(<Button className="o-grow">Copy</Button>);

    expect(screen.getByRole("button")).toHaveClass("o-grow");
  });
});
