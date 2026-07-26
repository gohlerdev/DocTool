import { ButtonHTMLAttributes, forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { Icon } from "./Icon";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: LucideIcon;
  label: string;
  variant?: "ghost" | "filled" | "accent";
  size?: "sm" | "md";
};

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { icon, label, variant = "ghost", size = "md", className, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={clsx("ui-icon-btn", `ui-icon-btn--${variant}`, `ui-icon-btn--${size}`, className)}
      {...rest}
    >
      <Icon icon={icon} size={size === "sm" ? 18 : 20} />
    </button>
  );
});
