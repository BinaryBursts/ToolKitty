import Link from "next/link";

import { cx } from "@/lib/classNames";

/** The padlock the approved design draws beside the notice. */
function LockIcon() {
  return (
    <svg
      className="o-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/**
 * The promise that nothing a visitor types leaves their device.
 *
 * Rendered by the page template on every tool page rather than by each tool, so
 * no tool can ship without it and the wording cannot drift from one page to the
 * next (REQ-2). It is the one piece of the page that has to be believed, so it
 * sits high on the page, states the fact in its first sentence, and links to
 * the policy that says it at length.
 *
 * The wording here is the template's default. The privacy and trust pass
 * (REQ-9) owns the final copy, including anything to say about analytics and
 * ads once those exist; deliberately, this notice claims nothing about them
 * yet, because neither is on the site today.
 */
export function PrivacyNotice({ className }: { className?: string }) {
  return (
    <div className={cx("t-privacy", className)}>
      <LockIcon />
      <p className="o-text" style={{ margin: 0 }}>
        <span className="o-strong">
          Everything you type here stays in your browser.
        </span>{" "}
        This tool runs on your device: nothing you enter is sent to a server,
        and nothing is remembered once you leave the page.{" "}
        <Link href="/privacy">Read the privacy policy</Link>
      </p>
    </div>
  );
}

export default PrivacyNotice;
