import type { LucideIcon, LucideProps } from "lucide-react";

type Props = LucideProps & {
  icon: LucideIcon;
  label?: string;
};

export function Icon({ icon: I, label, size = 20, strokeWidth = 2, ...rest }: Props) {
  return (
    <I
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      {...rest}
    />
  );
}
