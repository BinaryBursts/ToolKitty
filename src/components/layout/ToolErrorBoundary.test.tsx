import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToolErrorBoundary } from "./ToolErrorBoundary";

function ThrowingTool(): never {
  throw new Error("the tool blew up");
}

function WorkingTool() {
  return <p>Converted: 2.20 lb</p>;
}

describe("ToolErrorBoundary", () => {
  beforeEach(() => {
    // React logs the caught error itself, and the boundary logs its own line;
    // neither is a test failure, so the console is quiet for these tests.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the tool when nothing goes wrong", () => {
    render(
      <ToolErrorBoundary toolName="Weight Converter">
        <WorkingTool />
      </ToolErrorBoundary>,
    );

    expect(screen.getByText("Converted: 2.20 lb")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("replaces a tool that throws with an inline message naming it", () => {
    render(
      <ToolErrorBoundary toolName="Weight Converter">
        <ThrowingTool />
      </ToolErrorBoundary>,
    );

    const alert = screen.getByRole("alert");

    expect(alert).toHaveTextContent("This tool hit a problem");
    expect(alert).toHaveTextContent("Weight Converter");
    expect(alert).toHaveTextContent("Reload the page");
  });

  it("leaves everything around the tool standing", () => {
    render(
      <div>
        <h1>Weight Converter</h1>
        <ToolErrorBoundary toolName="Weight Converter">
          <ThrowingTool />
        </ToolErrorBoundary>
        <p>Supporting copy survives the failure.</p>
      </div>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Weight Converter" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Supporting copy survives the failure."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("reports the failure to the console and nowhere else", () => {
    render(
      <ToolErrorBoundary toolName="JSON Formatter">
        <ThrowingTool />
      </ToolErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("JSON Formatter threw while rendering."),
      expect.any(Error),
      expect.anything(),
    );
  });
});
