"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, RefreshCw, TicketPercent } from "lucide-react";

import { Authorize } from "@/components/access/authorize";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ApiError, couponApi, ensureAuthSession, programmeApiV2 } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import { cn } from "@/lib/utils";
import type {
  CouponCreateRequest,
  CouponResponse,
  CouponStatus,
  CouponType,
  CouponUsageType,
} from "@/types/coupon";
import { COUPON_STATUS_LABELS, COUPON_TYPE_LABELS } from "@/types/coupon";

const COUPON_TYPES: CouponType[] = [
  "FIXED_DISCOUNT",
  "PCT_DISCOUNT",
  "FREE_ITEM",
  "CASHBACK",
  "POINTS_BONUS",
];

const USAGE_TYPES: CouponUsageType[] = ["SINGLE_USE", "MULTI_USE"];

function toIsoEndOfDay(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59`).toISOString();
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusClass(status: CouponStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case "DRAFT":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
    case "EXPIRED":
    case "REVOKED":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200";
    case "EXHAUSTED":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function CouponManagementPanel() {
  const [programmeUid, setProgrammeUid] = useState("default");
  const [programmeRows, setProgrammeRows] = useState([{ programmeUid: "default", name: "Default programme" }]);
  const [coupons, setCoupons] = useState<CouponResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    couponCode: "",
    couponType: "FIXED_DISCOUNT" as CouponType,
    discountValue: "",
    discountPct: "",
    usageType: "MULTI_USE" as CouponUsageType,
    maxRedemptions: "1000",
    maxRedemptionsPerCustomer: "1",
    stackable: false,
    targetCustomerId: "",
    campaignUid: "",
    validUntil: "",
    minOrderAmount: "",
    maxDiscountCap: "",
    allowedChannels: "APP,WEB,POS",
    freeItemSku: "",
    freeItemLabel: "",
    activateImmediately: true,
  });

  const loadProgrammes = useCallback(async () => {
    try {
      await ensureAuthSession();
      const list = await programmeApiV2.listProgrammes();
      setProgrammeRows(mergeProgrammeDropdownRows(list));
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    }
  }, []);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      await ensureAuthSession();
      const rows = await couponApi.list(programmeUid);
      setCoupons(rows);
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [programmeUid]);

  useEffect(() => {
    void loadProgrammes();
  }, [loadProgrammes]);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  const selected = useMemo(
    () => coupons.find((c) => c.couponUid === selectedUid) ?? null,
    [coupons, selectedUid]
  );

  const programmeOptions = useMemo(
    () => programmeRows.map((p) => ({ value: p.programmeUid, label: p.name ?? p.programmeUid })),
    [programmeRows]
  );

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      couponCode: "",
      couponType: "FIXED_DISCOUNT",
      discountValue: "",
      discountPct: "",
      usageType: "MULTI_USE",
      maxRedemptions: "1000",
      maxRedemptionsPerCustomer: "1",
      stackable: false,
      targetCustomerId: "",
      campaignUid: "",
      validUntil: "",
      minOrderAmount: "",
      maxDiscountCap: "",
      allowedChannels: "APP,WEB,POS",
      freeItemSku: "",
      freeItemLabel: "",
      activateImmediately: true,
    });
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.couponCode.trim() || !form.validUntil) {
      toast.error("Name, coupon code, and expiry date are required");
      return;
    }
    const body: CouponCreateRequest = {
      programmeUid,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      couponCode: form.couponCode.trim(),
      couponType: form.couponType,
      usageType: form.usageType,
      maxRedemptions: Number(form.maxRedemptions) || 1,
      maxRedemptionsPerCustomer: Number(form.maxRedemptionsPerCustomer) || 1,
      stackable: form.stackable,
      targetCustomerId: form.targetCustomerId.trim() || null,
      campaignUid: form.campaignUid.trim() || null,
      validUntil: toIsoEndOfDay(form.validUntil),
      activateImmediately: form.activateImmediately,
      constraints: {
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        maxDiscountCap: form.maxDiscountCap ? Number(form.maxDiscountCap) : undefined,
        allowedChannels: form.allowedChannels
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        freeItemSku: form.freeItemSku.trim() || undefined,
        freeItemLabel: form.freeItemLabel.trim() || undefined,
        currency: "INR",
      },
    };
    if (form.couponType === "PCT_DISCOUNT") {
      body.discountPct = Number(form.discountPct);
    } else if (form.couponType !== "FREE_ITEM") {
      body.discountValue = Number(form.discountValue);
    }

    try {
      await ensureAuthSession();
      await couponApi.create(body);
      toast.success("Coupon created");
      setShowCreate(false);
      resetForm();
      void loadCoupons();
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    }
  };

  const handleActivate = async (couponUid: string) => {
    try {
      await couponApi.activate(couponUid);
      toast.success("Coupon activated");
      void loadCoupons();
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    }
  };

  const handleRevoke = async (couponUid: string) => {
    try {
      await couponApi.revoke(couponUid);
      toast.success("Coupon revoked");
      void loadCoupons();
    } catch (e) {
      if (e instanceof ApiError) toast.error(e.message);
    }
  };

  const showValueFields = form.couponType === "FIXED_DISCOUNT" || form.couponType === "CASHBACK" || form.couponType === "POINTS_BONUS";
  const showPctField = form.couponType === "PCT_DISCOUNT";
  const showFreeItemFields = form.couponType === "FREE_ITEM";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <TicketPercent className="h-7 w-7 text-primary" />
            Coupon Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Create promo codes for checkout (SAVE50, WELCOME10). Separate from points-based voucher inventory.
            Tenant apps validate and redeem via the integration API.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadCoupons()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
          <Authorize permission="coupons.create">
          <Authorize permission="coupons.create">
            <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
              <Plus className="h-4 w-4 mr-1" />
              Create coupon
            </Button>
          </Authorize>
          </Authorize>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="coupon-programme">Programme</Label>
            <NativeSelect
              id="coupon-programme"
              ariaLabel="Programme"
              value={programmeUid}
              onChange={setProgrammeUid}
              options={programmeOptions}
            />
          </div>
        </div>
      </Card>

      {showCreate && (
        <Card className="p-6 space-y-4 border-primary/30">
          <h2 className="text-lg font-medium">New coupon</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Summer sale 10% off" />
            </div>
            <div>
              <Label>Coupon code</Label>
              <Input value={form.couponCode} onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })} placeholder="SAVE10" />
            </div>
            <div>
              <Label>Type</Label>
              <NativeSelect
                ariaLabel="Coupon type"
                value={form.couponType}
                onChange={(v) => setForm({ ...form, couponType: v as CouponType })}
                options={COUPON_TYPES.map((t) => ({ value: t, label: COUPON_TYPE_LABELS[t] }))}
              />
            </div>
            {showValueFields && (
              <div>
                <Label>Value / points</Label>
                <Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
              </div>
            )}
            {showPctField && (
              <div>
                <Label>Percentage</Label>
                <Input type="number" value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: e.target.value })} />
              </div>
            )}
            {showFreeItemFields && (
              <>
                <div>
                  <Label>Free item SKU</Label>
                  <Input value={form.freeItemSku} onChange={(e) => setForm({ ...form, freeItemSku: e.target.value })} />
                </div>
                <div>
                  <Label>Free item label</Label>
                  <Input value={form.freeItemLabel} onChange={(e) => setForm({ ...form, freeItemLabel: e.target.value })} />
                </div>
              </>
            )}
            <div>
              <Label>Usage</Label>
              <NativeSelect
                ariaLabel="Usage type"
                value={form.usageType}
                onChange={(v) => setForm({ ...form, usageType: v as CouponUsageType })}
                options={USAGE_TYPES.map((u) => ({ value: u, label: u === "SINGLE_USE" ? "Single use (global)" : "Multi use" }))}
              />
            </div>
            <div>
              <Label>Max redemptions</Label>
              <Input type="number" value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} />
            </div>
            <div>
              <Label>Max per customer</Label>
              <Input type="number" value={form.maxRedemptionsPerCustomer} onChange={(e) => setForm({ ...form, maxRedemptionsPerCustomer: e.target.value })} />
            </div>
            <div>
              <Label>Valid until</Label>
              <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
            </div>
            <div>
              <Label>Min order amount</Label>
              <Input type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
            </div>
            {showPctField && (
              <div>
                <Label>Max discount cap</Label>
                <Input type="number" value={form.maxDiscountCap} onChange={(e) => setForm({ ...form, maxDiscountCap: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Allowed channels (comma-separated)</Label>
              <Input value={form.allowedChannels} onChange={(e) => setForm({ ...form, allowedChannels: e.target.value })} placeholder="APP,WEB,POS" />
            </div>
            <div>
              <Label>Target customer ID (optional)</Label>
              <Input value={form.targetCustomerId} onChange={(e) => setForm({ ...form, targetCustomerId: e.target.value })} placeholder="Leave empty for public" />
            </div>
            <div>
              <Label>Campaign UID (optional)</Label>
              <Input value={form.campaignUid} onChange={(e) => setForm({ ...form, campaignUid: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.stackable} onChange={(e) => setForm({ ...form, stackable: e.target.checked })} />
              Stackable with other coupons
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.activateImmediately} onChange={(e) => setForm({ ...form, activateImmediately: e.target.checked })} />
              Activate immediately
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void handleCreate()}>Save coupon</Button>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Code</th>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Usage</th>
                <th className="text-left p-3 font-medium">Expires</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {loading ? "Loading…" : "No coupons yet. Create your first promo code."}
                  </td>
                </tr>
              )}
              {coupons.map((c) => (
                <tr
                  key={c.couponUid}
                  className={cn("border-b hover:bg-muted/30 cursor-pointer", selectedUid === c.couponUid && "bg-muted/40")}
                  onClick={() => setSelectedUid(c.couponUid)}
                >
                  <td className="p-3 font-mono font-medium">{c.couponCode}</td>
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">{COUPON_TYPE_LABELS[c.couponType]}</td>
                  <td className="p-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusClass(c.status))}>
                      {COUPON_STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="p-3">{c.redemptionCount} / {c.maxRedemptions}</td>
                  <td className="p-3">{formatDate(c.validUntil)}</td>
                  <td className="p-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                    {c.status === "DRAFT" && (
                      <Authorize permission="coupons.edit">
                        <Button size="sm" variant="outline" onClick={() => void handleActivate(c.couponUid)}>Activate</Button>
                      </Authorize>
                    )}
                    {c.status === "ACTIVE" && (
                      <Authorize permission="coupons.edit">
                        <Button size="sm" variant="outline" onClick={() => void handleRevoke(c.couponUid)}>Revoke</Button>
                      </Authorize>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <Card className="p-4 space-y-2 text-sm">
          <h3 className="font-medium">Details — {selected.couponCode}</h3>
          <p className="text-muted-foreground">{selected.description || "No description"}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div><span className="text-muted-foreground">Stackable:</span> {selected.stackable ? "Yes" : "No"}</div>
            <div><span className="text-muted-foreground">Per customer limit:</span> {selected.maxRedemptionsPerCustomer}</div>
            <div><span className="text-muted-foreground">Target customer:</span> {selected.targetCustomerId || "Public"}</div>
            <div><span className="text-muted-foreground">Channels:</span> {selected.constraints?.allowedChannels?.join(", ") || "Any"}</div>
            <div><span className="text-muted-foreground">Min order:</span> {selected.constraints?.minOrderAmount ?? "—"}</div>
            <div><span className="text-muted-foreground">Campaign:</span> {selected.campaignUid || "—"}</div>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Integration: POST /api/v1/integration/{"{tenantId}"}/coupons/{selected.couponCode}/validate and /redeem
          </p>
        </Card>
      )}
    </div>
  );
}
