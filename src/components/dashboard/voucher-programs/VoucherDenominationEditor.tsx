"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, ensureAuthSession, voucherDenominationApi } from "@/lib/api/client";
import type { DenominationMappingDto, DenominationMappingItem } from "@/types/voucher";

type RowState = DenominationMappingItem & { id: string };

const defaultRow = (): RowState => ({
  id: crypto.randomUUID(),
  pointsRequired: 100,
  faceValue: 100,
  currency: "INR",
  description: "",
});

type Props = {
  programmeUid: string;
  catalogRewardUid: string;
  catalogName: string;
  onSaved?: () => void;
};

export function VoucherDenominationEditor({
  programmeUid,
  catalogRewardUid,
  catalogName,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<RowState[]>([defaultRow()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!catalogRewardUid) return;
    setLoading(true);
    try {
      await ensureAuthSession();
      const res = await voucherDenominationApi.getMappings(catalogRewardUid, programmeUid);
      if (res.mappings?.length) {
        setRows(
          res.mappings.map((m: DenominationMappingDto) => ({
            id: m.mappingUid || crypto.randomUUID(),
            pointsRequired: Number(m.pointsRequired),
            faceValue: Number(m.faceValue),
            currency: m.currency || "INR",
            description: m.description || "",
            partnerSku: m.partnerSku,
          }))
        );
      } else {
        setRows([defaultRow()]);
      }
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [catalogRewardUid, programmeUid]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    setSaving(true);
    try {
      await ensureAuthSession();
      const mappings: DenominationMappingItem[] = rows.map((r) => ({
        pointsRequired: r.pointsRequired,
        faceValue: r.faceValue,
        currency: r.currency.trim().toUpperCase(),
        description: r.description?.trim() || undefined,
        partnerSku: r.partnerSku?.trim() || undefined,
      }));
      await voucherDenominationApi.saveMappings(catalogRewardUid, programmeUid, mappings);
      toast.success("Denomination mappings saved");
      onSaved?.();
      await load();
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
      else toast.error("Failed to save mappings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 border-border/70 bg-[var(--surface-card)] space-y-4">
      <div>
        <p className="text-sm font-semibold">Points → voucher mapping</p>
        <p className="text-sm text-muted-foreground mt-1">
          Define how many loyalty points unlock each denomination for{" "}
          <strong className="text-foreground">{catalogName}</strong>. Upload one mixed CSV after saving —
          each row&apos;s <code className="text-xs">face_value</code> must match a tier below.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading mappings…</p>
      ) : (
        <div className="space-y-3">
          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_80px_1fr_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Loyalty points</span>
            <span>Voucher value (₹)</span>
            <span>CCY</span>
            <span>Label (optional)</span>
            <span />
          </div>
          {rows.map((row, idx) => (
            <div
              key={row.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_1fr_40px] gap-2 items-end rounded-xl border border-border/60 p-3 bg-[var(--surface-sunken)]"
            >
              <div>
                <Label className="sm:sr-only text-xs">Points</Label>
                <Input
                  type="number"
                  min={1}
                  value={row.pointsRequired}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, pointsRequired: Number(e.target.value) };
                    setRows(next);
                  }}
                />
              </div>
              <div>
                <Label className="sm:sr-only text-xs">Face value</Label>
                <Input
                  type="number"
                  min={1}
                  value={row.faceValue}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, faceValue: Number(e.target.value) };
                    setRows(next);
                  }}
                />
              </div>
              <div>
                <Label className="sm:sr-only text-xs">Currency</Label>
                <Input
                  value={row.currency}
                  maxLength={3}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, currency: e.target.value.toUpperCase() };
                    setRows(next);
                  }}
                />
              </div>
              <div>
                <Label className="sm:sr-only text-xs">Description</Label>
                <Input
                  placeholder="₹500 Airtel"
                  value={row.description ?? ""}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, description: e.target.value };
                    setRows(next);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={rows.length <= 1}
                onClick={() => setRows(rows.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setRows([...rows, defaultRow()])}>
          <Plus className="h-4 w-4 mr-1" />
          Add tier
        </Button>
        <Button type="button" size="sm" className="rounded-full" disabled={saving || !catalogRewardUid} onClick={() => void onSave()}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving…" : "Save mappings"}
        </Button>
      </div>
    </Card>
  );
}
