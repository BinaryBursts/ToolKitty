import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  COPY_CONFIRMATION_MS,
  COPY_FAILURE_MESSAGE,
  CopyButton,
} from "./CopyButton";

/** Put a clipboard — or nothing at all — on the test's navigator. */
function setClipboard(clipboard: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value: clipboard,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  setClipboard(undefined);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CopyButton", () => {
  it("copies exactly the string it was given", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(<CopyButton value="qR7!vTm2%eXk9Zda" label="Copy password" />);

    await act(async () => {
      screen.getByRole("button", { name: /Copy password/ }).click();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("qR7!vTm2%eXk9Zda");
  });

  it("confirms the copy in a polite live region and clears it after 2.5s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    const { container } = render(<CopyButton value="2.20" />);

    const status = container.querySelector('[role="status"]');
    expect(status).toHaveAttribute("aria-live", "polite");

    await act(async () => {
      screen.getByRole("button", { name: /Copy/ }).click();
    });

    expect(screen.getByText("Copied")).toBeInTheDocument();
    expect(status).toContainElement(screen.getByText("Copied"));

    // Still there just before the confirmation is due to clear...
    act(() => {
      vi.advanceTimersByTime(COPY_CONFIRMATION_MS - 100);
    });
    expect(screen.getByText("Copied")).toBeInTheDocument();

    // ...and gone just after.
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });

  it("tells the visitor to copy by hand when the clipboard rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    setClipboard({ writeText });

    render(<CopyButton value="2.20" />);

    await act(async () => {
      screen.getByRole("button", { name: /Copy/ }).click();
    });

    await waitFor(() => {
      expect(screen.getByText(COPY_FAILURE_MESSAGE)).toBeInTheDocument();
    });
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });

  it("tells the visitor to copy by hand when there is no clipboard API at all", async () => {
    setClipboard(undefined);

    render(<CopyButton value="2.20" />);

    await act(async () => {
      screen.getByRole("button", { name: /Copy/ }).click();
    });

    expect(screen.getByText(COPY_FAILURE_MESSAGE)).toBeInTheDocument();
  });

  it("never writes the copied text anywhere but the clipboard", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response());

    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });

    render(<CopyButton value="hunter2" />);

    await act(async () => {
      screen.getByRole("button", { name: /Copy/ }).click();
    });

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("hunter2");
  });

  it("reports a successful copy to its caller, with no arguments", async () => {
    const onCopied = vi.fn();
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });

    render(<CopyButton value="2.20" onCopied={onCopied} />);

    await act(async () => {
      screen.getByRole("button", { name: /Copy/ }).click();
    });

    expect(onCopied).toHaveBeenCalledTimes(1);
    expect(onCopied).toHaveBeenCalledWith();
  });

  it("can be disabled, and then copies nothing", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(<CopyButton value="2.20" disabled />);

    const button = screen.getByRole("button", { name: /Copy/ });
    expect(button).toBeDisabled();

    await act(async () => {
      button.click();
    });

    expect(writeText).not.toHaveBeenCalled();
  });
});
