import { Plus } from "lucide-react";
import { Icon } from "./Icon";

type Props = {
  label?: string;
  onClick: () => void;
};

export function FAB({ label = "Create", onClick }: Props) {
  return (
    <button type="button" className="ui-fab" aria-label={label} onClick={onClick}>
      <Icon icon={Plus} size={26} strokeWidth={2.5} />
    </button>
  );
}
