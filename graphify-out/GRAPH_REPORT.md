# Graph Report - loyaltyos-web-nextjs  (2026-05-18)

## Corpus Check
- 156 files · ~78,020 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 767 nodes · 2562 edges · 28 communities (25 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 159 edges
2. `Button()` - 55 edges
3. `useOnboardingStore` - 53 edges
4. `RuleFlowBuilder` - 42 edges
5. `Step1Account()` - 36 edges
6. `Card()` - 35 edges
7. `ConditionBuilder()` - 31 edges
8. `Step4Programme()` - 29 edges
9. `Input` - 29 edges
10. `ConditionsPageClient()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Detail()` --calls--> `cn()`  [EXTRACTED]
  src/app/admin/approvals/page.tsx → src/lib/utils.ts
- `AgreementStatusBadge()` --calls--> `cn()`  [EXTRACTED]
  src/app/admin/approvals/page.tsx → src/lib/utils.ts
- `AgreementStatusIcon()` --calls--> `cn()`  [EXTRACTED]
  src/app/admin/approvals/page.tsx → src/lib/utils.ts
- `StatusBadge()` --calls--> `cn()`  [EXTRACTED]
  src/app/admin/dashboard/page.tsx → src/lib/utils.ts
- `StatusBadge()` --calls--> `cn()`  [EXTRACTED]
  src/app/admin/tenants/[tenantId]/page.tsx → src/lib/utils.ts

## Communities (28 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (80): apiClient, ApiError, goLiveApi, onboardingApi, original, tenantConfigApi, clearSession(), getAccessToken() (+72 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (58): AdminLayout(), NAV_ITEMS, ensureAuthSession(), programmeApiV2, refreshSingleFlight(), metadata, ThemeToggle(), Providers() (+50 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (43): AnalyticsLayoutInner(), campaignsAdminApi, AWARD_TYPE_OPTIONS, buildCampaignUpsertPayload(), BuildPayloadContext, BuildPayloadResult, CampaignFormState, campaignToFormState() (+35 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (46): CreateRuleActionsPage(), FormData, schema, CreateRuleBasicInfoPage(), FormData, schema, CampaignBudgetProgress(), CampaignsLayout() (+38 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (33): ChipInput(), ChipInputProps, getMediaQuery(), getSnapshot(), subscribe(), usePrefersReducedMotion(), AnimatedSection(), AnimatedSectionProps (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (25): AnalyticsPanel(), AnalyticsStatCard(), AnalyticsProgrammeContext, AnalyticsProgrammeContextValue, AnalyticsProgrammeProvider(), ProgrammeRow, useAnalyticsProgramme(), AnalyticsSectionHeading() (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (29): ConditionFlowActions, ConditionFlowActionsProvider(), Ctx, useConditionFlowActions(), ConditionFlowErrorsProvider(), Ctx, NodeErrorLevel, useNodeErrorLevel() (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (27): integrationApi, CreateRuleIndex(), ApiKeyEnvironment, ApiKeySummary, IntegratePage(), ValidateEventErr, ValidateEventOk, WebhookStatus (+19 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (25): adminApi, adminClient, blob, parsed, token, handleError(), token, getApiBaseUrl() (+17 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (20): loyaltyRulesAdminApi, RuleChangeHistoryPage(), RuleConditionFlowPreview(), RuleDetailsPage(), RuleStatusBadge(), styles, MyRulesPage(), CreateRuleReviewPublishPage() (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (24): ConditionBuilder(), ConditionNodeEditor(), ConditionValueEditor(), defaultLeaf(), FIELD_OPTIONS, LogicalOpSelect(), newId(), opsForType() (+16 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (19): EventSchemaSetupPanel(), FIELD_TYPE_OPTIONS, buildEventSchemaJsonNode(), coerceFieldType(), DEFAULT_PURCHASE_CORE, defaultEventSchemaDraft(), EventSchemaCoreFieldDraft, EventSchemaCustomFieldDraft (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (20): RuleFlowBuilderHandle, ConditionsPageClient(), isGroupDeepValid(), isNodeValid(), isTreeValid(), ModeToggle(), CreateRuleConditionsPage(), createExpiringLocalStorage() (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (18): ValidationPanel(), ValidationPanelProps, toBackendConditionTree(), toBackendNode(), ActionNodeData, BuildResult, ConditionFieldMeta, ConditionFlowState (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (16): BuildOpts, findSingleEvent(), group(), leaf(), literalToNode(), normalizeValue(), not(), outgoingSorted() (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (15): AlertItem(), ChartTooltip(), DEFAULT_WIDGET_ORDER, PlaceholderPanel(), RewardsTable(), SeriesPoint, spark(), TenantDashboardHomePage() (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.21
Nodes (9): edgesFromMap(), getIncoming(), getOutgoing(), GraphValidator, newErrorId(), NodeValidator, errors, node (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (12): CHANNEL_OPTIONS, EVENT_TYPE_SUGGESTIONS, RuleEval, RuleSimulatePage(), SandboxValidateResponse, clearSandboxGate(), Gate, getSandboxGate() (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.21
Nodes (12): asNode(), diagramFromConditionTree(), edgeId(), Literal, nnf(), NnfNode, toDnf(), Literal (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (13): ActionMode, AdminIndustrySuggestionsPage(), ApprovedActiveActions(), ApprovedInactiveActions(), FieldFreeReason(), FieldLabelOverride(), FieldRejectReason(), PendingActions() (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (7): AdminApiError, AdminApprovalsPage(), AgreementStatusBadge(), AgreementStatusIcon(), Detail(), Tab, AllAgreementItem

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **106 isolated node(s):** `nextConfig`, `config`, `metadata`, `metadata`, `Tab` (+101 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 15`, `Community 17`, `Community 19`, `Community 20`?**
  _High betweenness centrality (0.207) - this node is a cross-community bridge._
- **Why does `RuleFlowBuilder` connect `Community 6` to `Community 1`, `Community 3`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 16`, `Community 18`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `ConditionsPageClient()` connect `Community 12` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 13`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `nextConfig`, `config`, `metadata` to the rest of the system?**
  _106 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._