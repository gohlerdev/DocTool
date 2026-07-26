import { CircleAlert } from "lucide-react";
import { Icon } from "./Icon";
import { Button } from "./Button";

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div className="ui-error" role="alert">
      <Icon icon={CircleAlert} size={18} />
      <span className="ui-error__msg">{message}</span>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
