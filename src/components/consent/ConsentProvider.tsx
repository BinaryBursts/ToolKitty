"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Where the visitor stands on analytics cookies, for this browsing session.
 *
 * `"unanswered"` is not a third opinion: it is the state the page starts in
 * and stays in while the banner is ignored, and it means exactly what
 * `"declined"` means to anything that would load a script — nothing may load.
 */
export type ConsentState = "unanswered" | "accepted" | "declined";

/** What {@link useConsent} hands back. */
export type ConsentContextValue = {
  /** The current answer. Starts at `"unanswered"` on every mount. */
  consent: ConsentState;
  /** Record acceptance. Analytics may load from this point in the session. */
  accept: () => void;
  /** Record refusal. Nothing loads, and nothing is written anywhere. */
  decline: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

/**
 * The consent answer for the current browsing session, and nothing else
 * (REQ-11).
 *
 * **It is React state and only React state.** This module does not read or
 * write a cookie, `localStorage` or `sessionStorage` — not even to remember a
 * refusal — because ToolKitty keeps nothing about a visitor between visits
 * (REQ-3). The banner appearing again on every visit is therefore not a
 * separate decision: it is the direct and unavoidable consequence of that
 * no-storage rule. There is nowhere a previous answer could have been kept,
 * so there is nothing to read back, and a reload starts at `"unanswered"`
 * again. The trade that comes with it is recorded on REQ-11: a returning
 * visitor has to accept again, and analytics undercounts.
 *
 * The answer does survive client-side navigation inside the session, because
 * the root layout mounts the provider once and Next.js does not remount it
 * when the route changes.
 *
 * It is the only state container the shell adds. Anything that needs to know
 * whether it may run — the analytics loader above all — asks
 * {@link useConsent} rather than keeping a copy of its own.
 */
export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>("unanswered");

  const accept = useCallback(() => {
    setConsent("accepted");
  }, []);

  const decline = useCallback(() => {
    setConsent("declined");
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({ consent, accept, decline }),
    [consent, accept, decline],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

/**
 * Read the session's consent answer, and the two ways to change it.
 *
 * Throws when used outside {@link ConsentProvider}: every page sits inside the
 * provider through the root layout, so a component that cannot find one is
 * mounted somewhere it should not be — and quietly answering "unanswered"
 * there would look like a working banner whose Accept never turned anything
 * on.
 */
export function useConsent(): ConsentContextValue {
  const value = useContext(ConsentContext);

  if (value === null) {
    throw new Error(
      "useConsent must be used inside <ConsentProvider>, which the root layout mounts.",
    );
  }

  return value;
}

export default ConsentProvider;
