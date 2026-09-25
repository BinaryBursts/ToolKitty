import { type SVGProps } from "react";

/**
 * The handful of inline icons the UI kit draws for itself.
 *
 * They are inline SVG for the same reason the header's menu icon is: no icon
 * font, no sprite request, and `currentColor` means each one is already the
 * right colour in both schemes. Every icon is `aria-hidden` — the control
 * around it carries the name.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg
      className="o-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Two sheets: the universal "copy to clipboard". */
export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V6a2.5 2.5 0 0 1 2.5-2.5H15" />
    </Icon>
  );
}

/** A tick, shown the moment something has been copied. */
export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 13 4.5 4.5L19 7" />
    </Icon>
  );
}

/** Two arrows passing each other: swap the two units over. */
export function SwapIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8h13m0 0-3.5-3.5M17 8l-3.5 3.5" />
      <path d="M20 16H7m0 0 3.5-3.5M7 16l3.5 3.5" />
    </Icon>
  );
}
