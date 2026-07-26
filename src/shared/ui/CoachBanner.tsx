import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { COACH_COPY, dismissCoach, shouldShowCoach, type CoachId } from "../lib/coach";
import { IconButton } from "./IconButton";

type Props = { id: CoachId };

export function CoachBanner({ id }: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    shouldShowCoach(id).then(setShow).catch(() => setShow(false));
  }, [id]);

  if (!show) return null;
  const c = COACH_COPY[id];
  return (
    <div className="coach-banner" role="status">
      <div className="coach-banner__text">
        <strong>{c.title}</strong>
        <p className="muted">{c.body}</p>
      </div>
      <IconButton
        icon={X}
        label="Dismiss tip"
        size="sm"
        onClick={async () => {
          await dismissCoach(id);
          setShow(false);
        }}
      />
    </div>
  );
}
