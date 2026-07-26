import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Icon } from "./Icon";

type Props = {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  chevron?: boolean;
  trailing?: React.ReactNode;
};

export function ListRow({
  title,
  subtitle,
  meta,
  icon,
  onClick,
  chevron = true,
  trailing,
}: Props) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp className="ui-list-row" onClick={onClick} type={onClick ? "button" : undefined}>
      {icon && (
        <span className="ui-list-row__icon">
          <Icon icon={icon} size={20} />
        </span>
      )}
      <span className="ui-list-row__text">
        <span className="ui-list-row__title">{title}</span>
        {subtitle && <span className="ui-list-row__sub">{subtitle}</span>}
      </span>
      {meta && <span className="ui-list-row__meta">{meta}</span>}
      {trailing}
      {chevron && onClick && (
        <Icon icon={ChevronRight} size={18} className="ui-list-row__chev" />
      )}
    </Comp>
  );
}
