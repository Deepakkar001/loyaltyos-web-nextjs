"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  referralApi,
  type ReferralCapRule,
  type ReferralDashboardResponse,
  type ReferralFraudPolicy,
  type ReferralFraudQueueItem,
  type ReferralListItem,
  type ReferralMilestoneTypeInfo,
  type ReferralPointsBudget,
  type ReferralProgrammeConfig,
  type ReferralRuleSchemaResponse,
  type ReferralTimeToPurchase,
  type ReferralTopReferrer,
  type ReferralTrendPoint,
} from "@/lib/api/client";
import { useProgrammeDropdown } from "@/lib/programme/use-programme-dropdown";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { DEFAULT_CONFIG, DEFAULT_RULES, rulesToDisplay } from "@/lib/referrals/referral-defaults";
import { useReferralNavStore } from "@/lib/referrals/referral-nav-store";

const PROGRAMME_QUERY = "programme";

type ReferralProgrammeContextValue = {
  tenantId: string | null;
  programmeUid: string;
  setProgrammeUid: (uid: string) => void;
  programmeOptions: Array<{ value: string; label: string }>;
  programmesLoading: boolean;
  ruleSchema: ReferralRuleSchemaResponse | null;
  dashboard: ReferralDashboardResponse | null;
  referrals: ReferralListItem[];
  referralsListLoading: boolean;
  programmeConfigured: boolean;
  fraudQueue: ReferralFraudQueueItem[];
  trends: ReferralTrendPoint[];
  topReferrers: ReferralTopReferrer[];
  timeToPurchase: ReferralTimeToPurchase | null;
  trendGranularity: "DAILY" | "WEEKLY";
  setTrendGranularity: (g: "DAILY" | "WEEKLY") => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  loading: boolean;
  name: string;
  setName: (n: string) => void;
  maxReferrals: number;
  setMaxReferrals: (n: number) => void;
  monthlyCap: number | "";
  setMonthlyCap: (n: number | "") => void;
  rollingCap: number | "";
  setRollingCap: (n: number | "") => void;
  rollingWindowDays: number | "";
  setRollingWindowDays: (n: number | "") => void;
  pointsBudget: ReferralPointsBudget | null;
  setPointsBudget: (b: ReferralPointsBudget | null) => void;
  config: ReferralProgrammeConfig;
  setConfig: React.Dispatch<React.SetStateAction<ReferralProgrammeConfig>>;
  programmeMilestoneTypes: ReferralMilestoneTypeInfo[];
  setProgrammeMilestoneTypes: (types: ReferralMilestoneTypeInfo[]) => void;
  enabledRuleKeys: string[];
  saving: boolean;
  reviewingUid: string | null;
  loadProgramme: () => Promise<void>;
  saveProgramme: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshReferralsList: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  refreshFraudQueue: () => Promise<void>;
  refreshAll: () => Promise<void>;
  exportCsv: () => Promise<void>;
  runFraudAction: (action: "approve" | "reject" | "override", referralUid: string) => Promise<void>;
  updateFraud: (patch: Partial<ReferralFraudPolicy>) => void;
};

const ReferralProgrammeContext = createContext<ReferralProgrammeContextValue | null>(null);

export function ReferralProgrammeProvider({ children }: { children: ReactNode }) {
  const tenantId = useOnboardingStore((s) => s.tenantId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setFraudQueueCount = useReferralNavStore((s) => s.setFraudQueueCount);

  const programmeUid = searchParams.get(PROGRAMME_QUERY)?.trim() || "default";

  const setProgrammeUid = useCallback(
    (uid: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(PROGRAMME_QUERY, uid.trim() || "default");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const { selectOptions: programmeOptions, loading: programmesLoading } = useProgrammeDropdown(
    tenantId,
    programmeUid
  );

  const [name, setName] = useState("Default referral programme");
  const [maxReferrals, setMaxReferrals] = useState(50);
  const [monthlyCap, setMonthlyCap] = useState<number | "">("");
  const [rollingCap, setRollingCap] = useState<number | "">("");
  const [rollingWindowDays, setRollingWindowDays] = useState<number | "">(30);
  const [pointsBudget, setPointsBudget] = useState<ReferralPointsBudget | null>(null);
  const [config, setConfig] = useState<ReferralProgrammeConfig>(DEFAULT_CONFIG());
  const [ruleSchema, setRuleSchema] = useState<ReferralRuleSchemaResponse | null>(null);
  const [programmeMilestoneTypes, setProgrammeMilestoneTypes] = useState<ReferralMilestoneTypeInfo[]>(
    rulesToDisplay(DEFAULT_RULES())
  );
  const [dashboard, setDashboard] = useState<ReferralDashboardResponse | null>(null);
  const [referrals, setReferrals] = useState<ReferralListItem[]>([]);
  const [referralsListLoading, setReferralsListLoading] = useState(false);
  const [programmeConfigured, setProgrammeConfigured] = useState(false);
  const [fraudQueue, setFraudQueue] = useState<ReferralFraudQueueItem[]>([]);
  const [trends, setTrends] = useState<ReferralTrendPoint[]>([]);
  const [topReferrers, setTopReferrers] = useState<ReferralTopReferrer[]>([]);
  const [timeToPurchase, setTimeToPurchase] = useState<ReferralTimeToPurchase | null>(null);
  const [trendGranularity, setTrendGranularity] = useState<"DAILY" | "WEEKLY">("DAILY");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewingUid, setReviewingUid] = useState<string | null>(null);

  const enabledRuleKeys = useMemo(
    () => (config.milestoneRules ?? []).filter((r) => r.enabled !== false).map((r) => r.key),
    [config.milestoneRules]
  );

  useEffect(() => {
    void referralApi
      .getRuleSchema(programmeUid)
      .then(setRuleSchema)
      .catch(() => setRuleSchema(null));
  }, [programmeUid]);

  const loadProgramme = useCallback(async () => {
    let p;
    try {
      p = await referralApi.getProgramme(programmeUid);
    } catch {
      p = null;
    }
    setProgrammeConfigured(!!p);
    if (p) {
      setName(p.name);
      setMaxReferrals(p.maxReferralsPerCustomer);
      const loaded = p.config ?? DEFAULT_CONFIG();
      if (!loaded.stages?.length) loaded.stages = DEFAULT_CONFIG().stages;
      if (!loaded.eligibility) loaded.eligibility = DEFAULT_CONFIG().eligibility;
      if (!loaded.fraudPolicy) loaded.fraudPolicy = DEFAULT_CONFIG().fraudPolicy;
      if (!loaded.milestoneRules?.length) loaded.milestoneRules = DEFAULT_RULES();
      const monthRule = loaded.capRules?.find((c) => c.type === "CALENDAR_MONTH_REFERRALS");
      setMonthlyCap(monthRule?.maxCount ?? "");
      const rollingRule = loaded.capRules?.find((c) => c.type === "ROLLING_DAY_REFERRALS");
      setRollingCap(rollingRule?.maxCount ?? "");
      setRollingWindowDays(rollingRule?.windowDays ?? 30);
      setPointsBudget(loaded.pointsBudget ?? null);
      if (!loaded.capRules?.length) {
        loaded.capRules = [{ type: "LIFETIME_REFERRALS", maxCount: p.maxReferralsPerCustomer }];
      }
      setConfig(loaded);
      setProgrammeMilestoneTypes(p.milestoneTypes ?? rulesToDisplay(loaded.milestoneRules ?? []));
    } else {
      setConfig(DEFAULT_CONFIG());
      setMonthlyCap("");
      setProgrammeMilestoneTypes(rulesToDisplay(DEFAULT_RULES()));
    }
  }, [programmeUid]);

  const refreshDashboard = useCallback(async () => {
    try {
      const d = await referralApi.getDashboard(programmeUid);
      setDashboard(d);
    } catch {
      setDashboard(null);
    }
  }, [programmeUid]);

  const refreshReferralsList = useCallback(async () => {
    setReferralsListLoading(true);
    try {
      const list = await referralApi.listReferrals(programmeUid, statusFilter || undefined);
      setReferrals(list);
    } catch {
      setReferrals([]);
    } finally {
      setReferralsListLoading(false);
    }
  }, [programmeUid, statusFilter]);

  const refreshAnalytics = useCallback(async () => {
    try {
      const [trendData, top, ttp] = await Promise.all([
        referralApi.getTrends(programmeUid, null, trendGranularity, 30),
        referralApi.getTopReferrers(programmeUid, null, 10),
        referralApi.getTimeToFirstPurchase(programmeUid),
      ]);
      setTrends(trendData);
      setTopReferrers(top);
      setTimeToPurchase(ttp);
    } catch {
      setTrends([]);
      setTopReferrers([]);
      setTimeToPurchase(null);
    }
  }, [programmeUid, trendGranularity]);

  const refreshFraudQueue = useCallback(async () => {
    try {
      const queue = await referralApi.listFraudQueue(programmeUid);
      setFraudQueue(queue);
      setFraudQueueCount(queue.length);
    } catch {
      setFraudQueue([]);
      setFraudQueueCount(0);
    }
  }, [programmeUid, setFraudQueueCount]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        refreshDashboard(),
        refreshReferralsList(),
        refreshAnalytics(),
        refreshFraudQueue(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [refreshAnalytics, refreshDashboard, refreshFraudQueue, refreshReferralsList]);

  const buildCapRules = useCallback((): ReferralCapRule[] => {
    const rules: ReferralCapRule[] = [{ type: "LIFETIME_REFERRALS", maxCount: maxReferrals }];
    if (monthlyCap !== "" && Number(monthlyCap) > 0) {
      rules.push({ type: "CALENDAR_MONTH_REFERRALS", maxCount: Number(monthlyCap) });
    }
    if (rollingCap !== "" && Number(rollingCap) > 0) {
      rules.push({
        type: "ROLLING_DAY_REFERRALS",
        maxCount: Number(rollingCap),
        windowDays: rollingWindowDays === "" ? 30 : Number(rollingWindowDays) || 30,
      });
    }
    return rules;
  }, [maxReferrals, monthlyCap, rollingCap, rollingWindowDays]);

  const saveProgramme = useCallback(async () => {
    setSaving(true);
    try {
      const payload: ReferralProgrammeConfig = {
        ...config,
        capRules: buildCapRules(),
        pointsBudget: pointsBudget?.maxPoints ? pointsBudget : undefined,
      };
      await referralApi.upsertProgramme({
        programmeUid,
        name,
        status: "ACTIVE",
        maxReferralsPerCustomer: maxReferrals,
        config: payload,
      });
      toast.success("Referral programme saved");
      await loadProgramme();
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [
    buildCapRules,
    config,
    loadProgramme,
    maxReferrals,
    name,
    pointsBudget,
    programmeUid,
    refreshAll,
  ]);

  const exportCsv = useCallback(async () => {
    try {
      const blob = await referralApi.exportCsv(programmeUid, statusFilter || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `referrals-${programmeUid}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }, [programmeUid, statusFilter]);

  const runFraudAction = useCallback(
    async (action: "approve" | "reject" | "override", referralUid: string) => {
      setReviewingUid(referralUid);
      try {
        if (action === "approve") await referralApi.approveFraud(referralUid, programmeUid);
        else if (action === "reject") await referralApi.rejectFraud(referralUid, programmeUid);
        else await referralApi.overrideFraud(referralUid, programmeUid);
        toast.success(`Referral ${action}d`);
        await refreshAll();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Review failed");
      } finally {
        setReviewingUid(null);
      }
    },
    [programmeUid, refreshAll]
  );

  const updateFraud = useCallback((patch: Partial<ReferralFraudPolicy>) => {
    setConfig((c) => ({
      ...c,
      fraudPolicy: { ...DEFAULT_CONFIG().fraudPolicy, ...c.fraudPolicy, ...patch },
    }));
  }, []);

  useEffect(() => {
    void refreshFraudQueue();
  }, [programmeUid, refreshFraudQueue]);

  useEffect(() => {
    void loadProgramme();
  }, [programmeUid, loadProgramme]);

  const value: ReferralProgrammeContextValue = {
    tenantId,
    programmeUid,
    setProgrammeUid,
    programmeOptions,
    programmesLoading,
    ruleSchema,
    dashboard,
    referrals,
    referralsListLoading,
    programmeConfigured,
    fraudQueue,
    trends,
    topReferrers,
    timeToPurchase,
    trendGranularity,
    setTrendGranularity,
    statusFilter,
    setStatusFilter,
    loading,
    name,
    setName,
    maxReferrals,
    setMaxReferrals,
    monthlyCap,
    setMonthlyCap,
    rollingCap,
    setRollingCap,
    rollingWindowDays,
    setRollingWindowDays,
    pointsBudget,
    setPointsBudget,
    config,
    setConfig,
    programmeMilestoneTypes,
    setProgrammeMilestoneTypes,
    enabledRuleKeys,
    saving,
    reviewingUid,
    loadProgramme,
    saveProgramme,
    refreshDashboard,
    refreshReferralsList,
    refreshAnalytics,
    refreshFraudQueue,
    refreshAll,
    exportCsv,
    runFraudAction,
    updateFraud,
  };

  return (
    <ReferralProgrammeContext.Provider value={value}>{children}</ReferralProgrammeContext.Provider>
  );
}

export function useReferralProgramme(): ReferralProgrammeContextValue {
  const ctx = useContext(ReferralProgrammeContext);
  if (!ctx) {
    throw new Error("useReferralProgramme must be used within ReferralProgrammeProvider");
  }
  return ctx;
}
