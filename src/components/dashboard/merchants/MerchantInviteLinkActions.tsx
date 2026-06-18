"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Copy, Link2, Loader2 } from "lucide-react";

import { Authorize } from "@/components/access/authorize";
import { Button } from "@/components/ui/button";
import { merchantApi } from "@/lib/api/merchant";

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Invite link copied");
  } catch {
    toast.error("Copy failed");
  }
}

type Props = {
  merchantUid: string;
  inviteUrl?: string | null;
  inviteExpiresAt?: string | null;
  portalUsername?: string | null;
  showResend?: boolean;
};

export function MerchantInviteLinkActions({
  merchantUid,
  inviteUrl,
  inviteExpiresAt,
  portalUsername,
  showResend = true,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState(inviteUrl ?? "");
  const [expiresAt, setExpiresAt] = useState(inviteExpiresAt ?? "");

  async function generateLink() {
    setLoading(true);
    try {
      const res = await merchantApi.issueInviteLink(merchantUid);
      setLink(res.inviteUrl);
      setExpiresAt(res.inviteExpiresAt ?? "");
      toast.success("New invite link generated — copy and share securely");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate invite link");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setLoading(true);
    try {
      const res = await merchantApi.resendInvite(merchantUid);
      if (res.inviteUrl) {
        setLink(res.inviteUrl);
        setExpiresAt(res.inviteExpiresAt ?? "");
      }
      if (res.inviteEmailSent) {
        toast.success(`Invite emailed to ${res.portalUsername ?? portalUsername ?? "merchant"}`);
      } else {
        toast.error("Email not sent — copy the invite link below");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resend failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border/60 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        Portal invite
      </div>
      <p className="text-xs text-muted-foreground">
        Share the invite link if email delivery fails. Links expire after the configured TTL and are
        single-use once the partner sets their password.
      </p>
      {portalUsername && (
        <p className="text-xs text-muted-foreground">
          Username: <span className="font-mono">{portalUsername}</span>
        </p>
      )}
      {link ? (
        <div className="space-y-2">
          <p className="break-all rounded-md bg-muted/50 p-2 font-mono text-xs">{link}</p>
          {expiresAt && (
            <p className="text-xs text-muted-foreground">Expires: {new Date(expiresAt).toLocaleString()}</p>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => void copyText(link)}
          >
            <Copy className="h-4 w-4 mr-1.5" />
            Copy invite link
          </Button>
        </div>
      ) : null}
      <Authorize permission="merchants.edit">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={loading}
            onClick={() => void generateLink()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate invite link"}
          </Button>
          {showResend && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={loading}
              onClick={() => void resend()}
            >
              Resend email
            </Button>
          )}
        </div>
      </Authorize>
    </div>
  );
}
