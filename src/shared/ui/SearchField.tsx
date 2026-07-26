import { Search, X } from "lucide-react";
import { InputHTMLAttributes } from "react";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  onClear?: () => void;
};

export function SearchField({ value, onClear, className, ...rest }: Props) {
  const hasValue = String(value ?? "").length > 0;
  return (
    <div className={`ui-search ${className ?? ""}`} role="search">
      <Icon icon={Search} size={18} className="ui-search__icon" />
      <input className="ui-search__input" type="search" value={value} {...rest} />
      {hasValue && onClear && (
        <IconButton icon={X} label="Clear search" size="sm" onClick={onClear} className="ui-search__clear" />
      )}
    </div>
  );
}
