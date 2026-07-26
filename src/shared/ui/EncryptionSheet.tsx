import { Sheet } from "./Sheet";
import { Button } from "./Button";

type Props = {
  open: boolean;
  onClose: () => void;
  crypto?: {
    vaultFormatVersion: number;
    kdf: string;
    kdfMemoryMib: number;
    kdfIterations: number;
    aead: string;
  } | null;
};

/** O6 — How encryption works */
export function EncryptionSheet({ open, onClose, crypto }: Props) {
  return (
    <Sheet
      open={open}
      title="How encryption works"
      onClose={onClose}
      footer={
        <Button variant="primary" block onClick={onClose}>
          Got it
        </Button>
      }
    >
      <div className="stack encryption-sheet">
        <p>
          <strong>Password never leaves this device.</strong> It is stretched with Argon2id
          {crypto ? ` (${crypto.kdfMemoryMib} MiB, t=${crypto.kdfIterations})` : ""} and used only to
          unwrap your master key.
        </p>
        <p>
          <strong>AES-256-GCM</strong> protects vault objects and note bodies at rest. Each object
          uses a purpose-bound key.
        </p>
        <p>
          <strong>Recovery key</strong> is a second unlock path. Store it offline. We cannot
          recreate either secret if both are lost.
        </p>
        <p>
          <strong>Google Drive</strong> (when linked) only receives ciphertext. Google cannot read
          your notes.
        </p>
        <p className="muted">
          Format v{crypto?.vaultFormatVersion ?? 2} · {crypto?.kdf ?? "Argon2id"} ·{" "}
          {crypto?.aead ?? "AES-256-GCM"}
        </p>
      </div>
    </Sheet>
  );
}
