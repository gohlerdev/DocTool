import { useMemo, useState } from "react";
import {
  Check,
  FileText,
  Folder,
  Settings as SettingsIcon,
  Shield,
  StickyNote,
} from "lucide-react";
import { api } from "../../shared/lib/invoke";
import { Button, ErrorBanner } from "../../shared/ui";
import { Icon } from "../../shared/ui/Icon";
import {
  LESSON_STEPS,
  MAP_DESTINATIONS,
  ONBOARDING_COMPLETED_KEY,
  ONBOARDING_OPEN_VAULT_KEY,
  type LessonStepId,
} from "./lessons";

type Props = {
  onFinished: (opts: { openVault: boolean }) => void;
};

const MAP_ICONS = {
  notes: StickyNote,
  files: Folder,
  vault: Shield,
  settings: SettingsIcon,
} as const;

export function OnboardingLesson({ onFinished }: Props) {
  const [index, setIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [openVaultAfter, setOpenVaultAfter] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = LESSON_STEPS[index];
  const isLast = index === LESSON_STEPS.length - 1;
  const progress = useMemo(
    () => LESSON_STEPS.map((s, i) => ({ id: s.id, done: i < index, active: i === index })),
    [index]
  );

  async function markComplete() {
    await api.settingsSet(ONBOARDING_COMPLETED_KEY, "1");
    if (openVaultAfter) {
      await api.settingsSet(ONBOARDING_OPEN_VAULT_KEY, "1");
    }
  }

  async function finish(openVault: boolean) {
    try {
      setBusy(true);
      setError(null);
      await markComplete();
      onFinished({ openVault: openVault || openVaultAfter });
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function skipAll() {
    await finish(false);
  }

  async function saveNoteAndContinue() {
    const t = title.trim() || "My first note";
    const plain = body.trim() || "Captured during the DocTool lesson.";
    // TipTap-compatible minimal doc JSON (paragraph)
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: plain
            ? [{ type: "text", text: plain }]
            : [],
        },
      ],
    };
    try {
      setBusy(true);
      setError(null);
      await api.notesUpsert({
        title: t,
        body: doc,
        color: "blue",
        labels: ["lesson"],
      });
      setNoteSaved(true);
      setIndex((i) => Math.min(i + 1, LESSON_STEPS.length - 1));
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    if (isLast) {
      void finish(openVaultAfter);
      return;
    }
    setIndex((i) => Math.min(i + 1, LESSON_STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setIndex((i) => Math.max(i - 1, 0));
  }

  async function onPrimary() {
    if (step.id === "first_note" && !noteSaved) {
      await saveNoteAndContinue();
      return;
    }
    if (isLast) {
      await finish(openVaultAfter);
      return;
    }
    goNext();
  }

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <header className="onboarding__header">
        <div className="onboarding__brand">
          Doc<span>Tool</span>
        </div>
        <button
          type="button"
          className="onboarding__skip"
          onClick={() => void skipAll()}
          disabled={busy}
        >
          Skip
        </button>
      </header>

      <div className="onboarding__progress" role="list" aria-label="Lesson progress">
        {progress.map((p) => (
          <span
            key={p.id}
            role="listitem"
            className={`onboarding__dot ${p.active ? "is-active" : ""} ${p.done ? "is-done" : ""}`}
            aria-current={p.active ? "step" : undefined}
          />
        ))}
      </div>

      <div className="onboarding__body">
        <p className="onboarding__step-label">
          Step {index + 1} of {LESSON_STEPS.length} · {step.label}
        </p>
        <h1 id="onboarding-title" className="onboarding__title">
          {step.title}
        </h1>
        <p className="onboarding__copy">{step.body}</p>

        {error && <ErrorBanner message={error} />}

        {step.id === "first_note" && (
          <div className="onboarding__interactive stack">
            <label className="onboarding__field-label" htmlFor="ob-title">
              Title
            </label>
            <input
              id="ob-title"
              className="field"
              placeholder="e.g. Grocery ideas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
              disabled={noteSaved || busy}
            />
            <label className="onboarding__field-label" htmlFor="ob-body">
              Note
            </label>
            <textarea
              id="ob-body"
              className="field"
              rows={4}
              placeholder="Type a real note — it will appear in Notes."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={noteSaved || busy}
            />
            {noteSaved && (
              <p className="onboarding__success">
                <Icon icon={Check} size={16} /> Saved to your notes library
              </p>
            )}
          </div>
        )}

        {step.id === "vault_intro" && (
          <div className="onboarding__choices stack">
            <button
              type="button"
              className={`onboarding__choice ${!openVaultAfter ? "is-selected" : ""}`}
              onClick={() => setOpenVaultAfter(false)}
            >
              <strong>Explore first</strong>
              <span className="muted">Set up the vault later when you’re ready</span>
            </button>
            <button
              type="button"
              className={`onboarding__choice ${openVaultAfter ? "is-selected" : ""}`}
              onClick={() => setOpenVaultAfter(true)}
            >
              <strong>Open Vault after this lesson</strong>
              <span className="muted">You’ll create a password & recovery key there</span>
            </button>
          </div>
        )}

        {step.id === "map" && (
          <ul className="onboarding__map">
            {MAP_DESTINATIONS.map((d) => {
              const Ico = MAP_ICONS[d.id];
              return (
                <li key={d.id} className="onboarding__map-item">
                  <span className="onboarding__map-icon">
                    <Icon icon={Ico} size={20} />
                  </span>
                  <span>
                    <strong>{d.title}</strong>
                    <span className="muted">{d.blurb}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {step.id === "done" && (
          <ul className="onboarding__checklist-preview">
            <li>
              <Icon icon={FileText} size={16} /> Notes are ready
            </li>
            <li>
              <Icon icon={Shield} size={16} /> Vault optional until you need it
            </li>
            <li>
              <Icon icon={SettingsIcon} size={16} /> Replay lesson in Settings
            </li>
          </ul>
        )}
      </div>

      <footer className="onboarding__footer">
        {index > 0 && (
          <Button variant="ghost" size="md" onClick={goBack} disabled={busy}>
            Back
          </Button>
        )}
        <Button
          variant="primary"
          size="md"
          block={index === 0}
          className={index > 0 ? "onboarding__primary-grow" : undefined}
          disabled={busy}
          onClick={() => void onPrimary()}
        >
          {busy
            ? "Working…"
            : step.id === "first_note" && !noteSaved
              ? "Save note & continue"
              : step.primaryLabel ?? "Continue"}
        </Button>
      </footer>
    </div>
  );
}

/** Load whether onboarding v1 is finished. */
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const v = await api.settingsGet(ONBOARDING_COMPLETED_KEY);
    return v === "1" || v === "true";
  } catch {
    return false;
  }
}

export async function resetOnboarding(): Promise<void> {
  await api.settingsSet(ONBOARDING_COMPLETED_KEY, "0");
  await api.settingsSet(ONBOARDING_OPEN_VAULT_KEY, "0");
}

export async function consumeOpenVaultFlag(): Promise<boolean> {
  try {
    const v = await api.settingsGet(ONBOARDING_OPEN_VAULT_KEY);
    if (v === "1" || v === "true") {
      await api.settingsSet(ONBOARDING_OPEN_VAULT_KEY, "0");
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export type { LessonStepId };
