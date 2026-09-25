import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InlineMessage } from "./InlineMessage";

describe("InlineMessage", () => {
  it("renders an info message quietly", () => {
    const { container } = render(
      <InlineMessage>Everything stays in your browser.</InlineMessage>,
    );

    const alert = container.firstElementChild;

    expect(alert).toHaveClass("o-alert");
    expect(alert).not.toHaveClass("o-alert--danger");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("announces an error as soon as it appears", () => {
    render(
      <InlineMessage variant="error" title="That is not valid JSON">
        Unexpected token at line 3.
      </InlineMessage>,
    );

    const alert = screen.getByRole("alert");

    expect(alert).toHaveClass("o-alert--danger");
    expect(alert).toHaveTextContent("That is not valid JSON");
    expect(alert).toHaveTextContent("Unexpected token at line 3.");
  });

  it("renders an empty state with a title and an action", () => {
    const { container } = render(
      <InlineMessage
        variant="empty"
        title="No tools match that search"
        action={<button type="button">Clear search</button>}
      >
        Try a shorter word.
      </InlineMessage>,
    );

    expect(container.firstElementChild).toHaveClass("o-empty");
    expect(screen.getByText("No tools match that search")).toHaveClass("o-h3");
    expect(
      screen.getByRole("button", { name: "Clear search" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps classes a caller adds", () => {
    const { container } = render(
      <InlineMessage className="o-grow">Hello</InlineMessage>,
    );

    expect(container.firstElementChild).toHaveClass("o-grow");
  });
});
