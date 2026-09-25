"use client";

import { useEffect, useState } from "react";

import { cx } from "@/lib/classNames";

import { Button, type ButtonSize, type ButtonVariant } from "./Button";
import { CheckIcon, CopyIcon } from "./icons";

/** How long the inline "Copied" confirmation stays on screen. */
export const COPY_CONFIRMATION_MS = 2500;

/** Shown when the browser will not give us the clipboard. */
export const COPY_FAILURE_MESSAGE = "Copy failed — select and copy manually";

type CopyStatus = "idle" | "copied" | "failed";

export type CopyButtonProps = {
  /** The exact text to put on the clipboard. */
  value: string;
  /** Button text. Defaults to "Copy". */
  label?: string;
  /** Confirmation text. Defaults to "Copied". */
  copiedLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Extra classes on the wrapper that holds the button and its message. */
  className?: string;
  disabled?: boolean;
  /**
   * Called after a successful copy — deliberately with no arguments, so a
   * caller cannot pass the copied text on to anything.
   */
  onCopied?: () => void;
};

/**
 * Copy-to-clipboard with its confirmation right beside it.
 *
 * The copied text never leaves this component: it is handed to
 * `navigator.clipboard.writeText` and nothing else — not logged, not put in an
 * analytics event, not written to storage — which is what lets the password
 * generator claim the password only ever exists in the page and on the
 * clipboard.
 *
 * When the clipboard API is missing (an insecure origin, an old browser) or
 * rejects (the permission denied, the document not focused), the visitor is
 * told to select and copy by hand instead of being left wondering. That message
 * stays until the next attempt; the success confirmation clears itself after
 * about two and a half seconds.
 */
export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  variant = "primary",
  size = "md",
  className,
  disabled = false,
  onCopied,
}: CopyButtonProps) {
  // `nonce` makes a second copy a new state, so the confirmation timer starts
  // again rather than expiring on the first click's schedule.
  const [state, setState] = useState<{ status: CopyStatus; nonce: number }>({
    status: "idle",
    nonce: 0,
  });

  useEffect(() => {
    if (state.status !== "copied") {
      return;
    }

    const timer = setTimeout(() => {
      setState((prev) =>
        prev.status === "copied" ? { ...prev, status: "idle" } : prev,
      );
    }, COPY_CONFIRMATION_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [state]);

  async function copy() {
    try {
      const clipboard =
        typeof navigator === "undefined" ? undefined : navigator.clipboard;

      if (typeof clipboard?.writeText !== "function") {
        throw new Error("Clipboard API unavailable");
      }

      await clipboard.writeText(value);

      setState((prev) => ({ status: "copied", nonce: prev.nonce + 1 }));
      onCopied?.();
    } catch {
      // The rejection is swallowed on purpose: reporting it would risk putting
      // the copied text (or a fragment of it) somewhere it should not be.
      setState((prev) => ({ status: "failed", nonce: prev.nonce + 1 }));
    }
  }

  return (
    <span className={cx("o-row", "t-copybtn", className)}>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={() => {
          void copy();
        }}
      >
        {state.status === "copied" ? (
          <CheckIcon size={16} />
        ) : (
          <CopyIcon size={16} />
        )}
        {label}
      </Button>

      {/* Always in the document, so a message appearing inside it is announced
          politely rather than the region itself arriving unnoticed. */}
      <span role="status" aria-live="polite" className="t-copybtn__status">
        {state.status === "copied" ? (
          <span className="o-badge o-badge--success">{copiedLabel}</span>
        ) : null}
        {state.status === "failed" ? (
          <span className="o-error">{COPY_FAILURE_MESSAGE}</span>
        ) : null}
      </span>
    </span>
  );
}

export default CopyButton;
