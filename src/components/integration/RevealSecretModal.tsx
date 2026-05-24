"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  secret: string | null;
  keyPrefix: string;
  onClose: () => void;
  onCopy: (value: string) => void;
};

export function RevealSecretModal({ open, secret, keyPrefix, onClose, onCopy }: Props) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) setConfirmed(false);
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-lg gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>Reveal signing secret</DialogTitle>
          <DialogDescription>
            API key: {keyPrefix}… — this access is logged for audit.
          </DialogDescription>
        </DialogHeader>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="rounded border-border"
          />
          I understand the security implications
        </label>

        {confirmed && secret && (
          <div className="rounded-lg border border-border bg-[var(--surface-sunken)] p-4 space-y-2">
            <code className="block text-sm break-all font-mono">{secret}</code>
            <Button size="sm" variant="outline" onClick={() => onCopy(secret)}>
              Copy secret
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
