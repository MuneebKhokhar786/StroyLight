import type { ButtonHTMLAttributes } from "react";

/**
 * The base tap target for the child surface: large, high-contrast, and never
 * smaller than 72px on a side per the Firefly Words hit-target rule (6.2).
 */
export function BigButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="big-button" {...props}>
      {children}
    </button>
  );
}
