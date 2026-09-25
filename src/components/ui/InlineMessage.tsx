import { type ReactNode } from "react";

import { cx } from "@/lib/classNames";

/**
 * - `info` — help and reassurance that is always there (`o-alert`).
 * - `error` — something the visitor typed cannot be used (`o-alert--danger`).
 * - `empty` — there is nothing to show yet (`o-empty`).
 */
export type InlineMessageVariant = "info" | "error" | "empty";

export type InlineMessageProps = {
  variant?: InlineMessageVariant;
  /** Short headline. Optional for info and error, usual for empty. */
  title?: ReactNode;
  /** The message. */
  children?: ReactNode;
  /** Something to do about it, e.g. a button that clears the field. */
  action?: ReactNode;
  className?: string;
};

/**
 * A message in the flow of a tool: guidance, a validation failure, or an empty
 * state where a result will appear.
 *
 * The error variant carries `role="alert"`, so a message that replaces a wrong
 * answer — "Enter a number", "Temperature is below absolute zero" — is read out
 * as soon as it appears. Info and empty are silent: they are part of the page,
 * not news.
 *
 * Field-level errors belong in `<Field error=...>` rather than here; this is
 * for messages about the tool as a whole.
 */
export function InlineMessage({
  variant = "info",
  title,
  children,
  action,
  className,
}: InlineMessageProps) {
  if (variant === "empty") {
    return (
      <div className={cx("o-empty", "o-stack--tight", className)}>
        {title ? <p className="o-h3">{title}</p> : null}
        {children ? <div className="o-text">{children}</div> : null}
        {action ? <div className="o-row">{action}</div> : null}
      </div>
    );
  }

  const isError = variant === "error";

  return (
    <div
      className={cx("o-alert", isError && "o-alert--danger", className)}
      role={isError ? "alert" : undefined}
    >
      <div className="o-stack--tight">
        {title ? <p className="o-strong">{title}</p> : null}
        {children ? <div className="o-text">{children}</div> : null}
        {action ? <div className="o-row">{action}</div> : null}
      </div>
    </div>
  );
}

export default InlineMessage;
