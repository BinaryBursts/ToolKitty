import type { ElementType, HTMLAttributes, ReactNode } from "react";

/** Elements a container is allowed to render as. */
type ContainerElement = "div" | "section" | "header" | "footer" | "nav";

type ContainerProps = HTMLAttributes<HTMLElement> & {
  /** Element to render. Defaults to a plain `div`. */
  as?: ContainerElement;
  children?: ReactNode;
};

/**
 * The one place the page's maximum width and side gutters are decided.
 *
 * Every page section wraps its content in a `<Container>` so the header, the
 * main content and the footer line up down the page, and so a 320 px viewport
 * never scrolls sideways: the width is fluid and the gutters shrink with it
 * (see `.o-container` in globals.css).
 */
export function Container({
  as = "div",
  className,
  children,
  ...rest
}: ContainerProps) {
  const Element: ElementType = as;
  const classes = className ? `o-container ${className}` : "o-container";

  return (
    <Element className={classes} {...rest}>
      {children}
    </Element>
  );
}

export default Container;
