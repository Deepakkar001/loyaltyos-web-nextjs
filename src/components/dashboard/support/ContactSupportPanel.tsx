"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Headset, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { SupportSectionShell } from "@/components/dashboard/support/SupportSectionShell";
import { SupportCaseDetailCard } from "@/components/support/SupportCaseDetailCard";
import {
  supportApi,
  type CreateSupportCaseRequest,
  type SupportCase,
  type SupportCaseCategory,
  type SupportCasePriority,
  type SupportContext,
} from "@/lib/api/support";
import { useProgrammeDropdown } from "@/lib/programme/use-programme-dropdown";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  SUPPORT_SHORTCUTS,
} from "@/lib/support/support-content";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS: Array<{ value: SupportCaseCategory; label: string }> = [
  { value: "INTEGRATION", label: CATEGORY_LABELS.INTEGRATION },
  { value: "RULES_CAMPAIGNS", label: CATEGORY_LABELS.RULES_CAMPAIGNS },
  { value: "REFERRALS", label: CATEGORY_LABELS.REFERRALS },
  { value: "VOUCHERS", label: CATEGORY_LABELS.VOUCHERS },
  { value: "BILLING", label: CATEGORY_LABELS.BILLING },
  { value: "GO_LIVE", label: CATEGORY_LABELS.GO_LIVE },
  { value: "MODULE_ACCESS_REQUEST", label: CATEGORY_LABELS.MODULE_ACCESS_REQUEST },
  { value: "OTHER", label: CATEGORY_LABELS.OTHER },
];

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "RESOLVED":
    case "CLOSED":
      return "secondary";
    case "IN_PROGRESS":
      return "default";
    default:
      return "outline";
  }
}

const PROGRAMME_NONE = "";

export function ContactSupportPanel() {
  const searchParams = useSearchParams();
  const tenantId = useOnboardingStore((s) => s.tenantId);
  const [context, setContext] = useState<SupportContext | null>(null);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastCreatedUid, setLastCreatedUid] = useState<string | null>(null);
  const [selectedCaseUid, setSelectedCaseUid] = useState<string | null>(null);

  const [category, setCategory] = useState<SupportCaseCategory>("INTEGRATION");
  const [priority, setPriority] = useState<SupportCasePriority>("NORMAL");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const [programmeUid, setProgrammeUid] = useState(PROGRAMME_NONE);

  const { selectOptions: programmeOptions, loading: programmesLoading } = useProgrammeDropdown(
    tenantId,
    programmeUid || undefined
  );

  const programmeSelectOptions = useMemo(() => {
    const none = { value: PROGRAMME_NONE, label: "— Not tied to a programme —" };
    if (programmeOptions.length > 0) return [none, ...programmeOptions];
    return [none, { value: "default", label: "Default programme (default)" }];
  }, [programmeOptions]);

  const prefillApplied = useMemo(() => searchParams.get("prefill") === "1", [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ctx, list] = await Promise.all([supportApi.getContext(), supportApi.listCases()]);
      setContext(ctx);
      setCases(list);
      if (selectedCaseUid && !list.some((c) => c.caseUid === selectedCaseUid)) {
        setSelectedCaseUid(list[0]?.caseUid ?? null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load support");
    } finally {
      setLoading(false);
    }
  }, [selectedCaseUid]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCase = useMemo(
    () => cases.find((c) => c.caseUid === selectedCaseUid) ?? null,
    [cases, selectedCaseUid]
  );

  useEffect(() => {
    if (!prefillApplied) return;
    const cat = searchParams.get("category");
    if (cat && cat in CATEGORY_LABELS) setCategory(cat as SupportCaseCategory);
    const subj = searchParams.get("subject");
    if (subj) setSubject(subj);
    const desc = searchParams.get("description");
    if (desc) setDescription(desc);
    const rid = searchParams.get("requestId") ?? searchParams.get("correlationId");
    if (rid) setCorrelationId(rid);
    const prog = searchParams.get("programme");
    if (prog) setProgrammeUid(prog);
    if (searchParams.get("priority") === "URGENT") setPriority("URGENT");
  }, [prefillApplied, searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 3) {
      toast.error("Subject must be at least 3 characters");
      return;
    }
    if (description.trim().length < 10) {
      toast.error("Please describe the issue in at least 10 characters");
      return;
    }
    setSubmitting(true);
    try {
      const body: CreateSupportCaseRequest = {
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        correlationId: correlationId.trim() || undefined,
        programmeUid: programmeUid.trim() || undefined,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
      };
      const created = await supportApi.createCase(body);
      setLastCreatedUid(created.caseUid);
      setSelectedCaseUid(created.caseUid);
      toast.success(`Case ${created.caseUid} submitted`);
      setSubject("");
      setDescription("");
      setCorrelationId("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit case");
    } finally {
      setSubmitting(false);
    }
  };

  const attachError = (requestId: string) => {
    setCorrelationId(requestId);
    setCategory("INTEGRATION");
    const err = context?.recentIntegrationErrors.find((x) => x.requestId === requestId);
    if (err) {
      setSubject(`API error ${err.httpStatus} on ${err.requestPath}`);
      setDescription(
        `Request ID: ${err.requestId}\nMethod: ${err.httpMethod} ${err.requestPath}\nStatus: ${err.httpStatus}\nError: ${err.errorMessage ?? err.errorCode ?? "—"}\n\nAdditional details:\n`
      );
    }
  };

  return (
    <SupportSectionShell
      title="Contact support"
      description="Open a case for the LoyaltyOS team. We attach tenant context and recent integration errors to speed up diagnosis."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUPPORT_SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
          >
            <p className="text-sm font-medium">{s.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
          </Link>
        ))}
      </div>

      {context && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <p>
            <span className="text-muted-foreground">Tenant:</span>{" "}
            <span className="font-mono text-xs">{context.tenantId}</span>
            {context.companyName && (
              <>
                {" · "}
                <span className="font-medium">{context.companyName}</span>
              </>
            )}
          </p>
          <p className="mt-1 text-muted-foreground">{context.slaResponseHint}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="lg:col-span-3 space-y-4 rounded-lg border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Headset className="h-5 w-5 text-brand-600" />
            <h2 className="text-sm font-semibold">Open a case</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="support-category">Category</Label>
              <NativeSelect
                id="support-category"
                ariaLabel="Support case category"
                value={category}
                onChange={(v) => setCategory(v as SupportCaseCategory)}
                options={CATEGORY_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-priority">Priority</Label>
              <NativeSelect
                id="support-priority"
                ariaLabel="Support case priority"
                value={priority}
                onChange={(v) => setPriority(v as SupportCasePriority)}
                options={[
                  { value: "NORMAL", label: "Normal" },
                  { value: "URGENT", label: "Urgent — production impact" },
                ]}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="support-subject">Subject</Label>
            <Input
              id="support-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="Short summary of the issue"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="support-description">Description</Label>
            <Textarea
              id="support-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              maxLength={5000}
              placeholder="Steps to reproduce, expected vs actual behaviour, customer IDs (no full PAN/PII)."
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="support-correlation">Request / correlation ID (optional)</Label>
              <Input
                id="support-correlation"
                value={correlationId}
                onChange={(e) => setCorrelationId(e.target.value)}
                placeholder="From integration audit log"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-programme">Loyalty programme (optional)</Label>
              <NativeSelect
                id="support-programme"
                ariaLabel="Loyalty programme for this support case"
                value={programmeUid}
                onChange={setProgrammeUid}
                options={programmeSelectOptions}
                disabled={programmesLoading || !tenantId}
              />
            </div>
          </div>

          {context && context.recentIntegrationErrors.length > 0 && (
            <div className="rounded-md border border-dashed p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Recent API errors (attach)</p>
              <ul className="space-y-1.5">
                {context.recentIntegrationErrors.map((err) => (
                  <li key={err.requestId} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono truncate max-w-[240px]">
                      {err.httpStatus} {err.httpMethod} {err.requestPath}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => attachError(err.requestId)}
                    >
                      Use in form
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            type="submit"
            className="rounded-full border-2 border-brand-700/40 dark:border-brand-500/50"
            disabled={submitting || loading}
          >
            {submitting ? "Submitting…" : "Submit case"}
          </Button>

          {lastCreatedUid && (
            <p className="text-xs text-muted-foreground">
              Reference: <span className="font-mono text-foreground">{lastCreatedUid}</span> — quote this in
              follow-up email.
            </p>
          )}
        </form>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">My cases</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
          <div className="rounded-lg border bg-card shadow-sm max-h-[280px] overflow-y-auto">
            {loading && (
              <p className="p-4 text-sm text-muted-foreground">Loading cases…</p>
            )}
            {!loading && cases.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No cases yet. Submit a form to get help.</p>
            )}
            {!loading &&
              cases.map((c) => (
                <button
                  key={c.caseUid}
                  type="button"
                  onClick={() => setSelectedCaseUid(c.caseUid)}
                  className={cn(
                    "w-full text-left border-b last:border-0 p-4 space-y-1.5 transition-colors hover:bg-muted/40",
                    selectedCaseUid === c.caseUid && "bg-muted/50"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(c.status)}>{STATUS_LABELS[c.status] ?? c.status}</Badge>
                    {c.priority === "URGENT" && <Badge variant="destructive">Urgent</Badge>}
                  </div>
                  <p className="text-sm font-medium leading-snug">{c.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[c.category] ?? c.category} ·{" "}
                    {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">{c.caseUid}</p>
                </button>
              ))}
          </div>
          {selectedCase && (
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Case details
              </h3>
              <SupportCaseDetailCard
                caseItem={selectedCase}
                onUpdateStatus={(uid, status) => supportApi.updateCaseStatus(uid, { status })}
                onStatusUpdated={(updated) => {
                  setCases((prev) =>
                    prev.map((c) => (c.caseUid === updated.caseUid ? updated : c))
                  );
                }}
              />
            </div>
          )}
        </div>
      </div>
    </SupportSectionShell>
  );
}
