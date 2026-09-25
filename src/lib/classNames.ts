/**
 * Join class names, dropping anything falsy.
 *
 * The UI kit maps each component onto classes from the approved theme
 * (`o-btn`, `o-input`, `t-seg`, ...) and lets the caller add its own, so nearly
 * every component needs the same small join. Keeping it here means no
 * component has to reach for a dependency to do it.
 *
 * @example
 * cx("o-btn", variant === "primary" && "o-btn--primary", className)
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" ");
}

export default cx;
