"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiKeyGeneratedResponse } from "@/types/onboarding";

type Props = {
  open: boolean;
  credentials: ApiKeyGeneratedResponse | null;
  onClose: () => void;
  onCopy: (value: string) => void;
};

export function GenerateCredentialModal({ open, credentials, onClose, onCopy }: Props) {
  const envVars =
    credentials?.apiKey && credentials?.signingSecret
      ? `LOYALTYOS_API_KEY=${credentials.apiKey}\nLOYALTYOS_SIGNING_SECRET=${credentials.signingSecret}`
      : "";

  return (
    <Dialog
      open={open && !!credentials}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-lg gap-5" showCloseButton>
        <DialogHeader>
          <DialogTitle>New credentials generated</DialogTitle>
          <DialogDescription className="text-amber-600 dark:text-amber-400">
            This is the only time your signing secret will be shown. Store it securely.
          </DialogDescription>
        </DialogHeader>

        {credentials && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-[var(--surface-sunken)] p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">API Key</p>
              <code className="block text-sm break-all font-mono">{credentials.apiKey}</code>
              <Button size="sm" variant="outline" onClick={() => onCopy(credentials.apiKey!)}>
                Copy API key
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-[var(--surface-sunken)] p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Signing Secret</p>
              <code className="block text-sm break-all font-mono">{credentials.signingSecret}</code>
              <Button size="sm" variant="outline" onClick={() => onCopy(credentials.signingSecret!)}>
                Copy signing secret
              </Button>
            </div>

            {envVars && (
              <Button size="sm" variant="secondary" className="w-full" onClick={() => onCopy(envVars)}>
                Copy as .env
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
