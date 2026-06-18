export type RuleStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
export type ExecutionMode = "FIRST_MATCH" | "ALL_MATCHING";

export type RuleActionUpsertItem = {
  actionUid?: string;
  actionType: "AWARD_POINTS" | "ISSUE_VOUCHER";
  formula: string;
  config?: unknown;
};

export type RuleType = "PROGRAMME" | "CAMPAIGN";

export type RuleUpsertRequest = {
  programmeUid?: string;
  ruleType?: RuleType;
  campaignUid?: string;
  ruleUid?: string;
  name: string;
  description?: string;
  priority: number;
  triggerEventType: string;
  executionMode: ExecutionMode;
  status: RuleStatus;
  conditionTree: unknown;
  effectiveAt?: string; // ISO
  endAt?: string; // ISO
  actions: RuleActionUpsertItem[];
};

export type EarnRuleResponse = {
  id: number;
  tenantId: string;
  programmeUid: string;
  ruleType?: RuleType;
  campaignUid?: string;
  ruleUid: string;
  name: string;
  status: RuleStatus;
  triggerEventType: string;
  executionMode: ExecutionMode;
};

export type EarnRuleDetailResponse = EarnRuleResponse & {
  ruleType?: RuleType;
  campaignUid?: string;
  description?: string;
  priority: number;
  effectiveAt?: string | null;
  endAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  activatedAt?: string | null;
  archivedAt?: string | null;
  conditionTree: unknown;
  actions: Array<{
    id: number;
    actionUid: string;
    actionType: string;
    formula?: string | null;
    config?: unknown;
  }>;
};

export type RuleChangeLogResponse = {
  id: number;
  ruleUid: string;
  changeType: "CREATED" | "UPDATED" | "STATUS_CHANGED" | "DELETED";
  changedBy: string;
  beforeState?: string | null;
  afterState?: string | null;
  changedAt: string;
};

