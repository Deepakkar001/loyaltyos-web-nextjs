# Graph Report - loyaltyos-web-nextjs  (2026-05-13)

## Corpus Check
- 120 files · ~61,052 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 587 nodes · 2005 edges · 28 communities (26 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5e767fd0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 140 edges
2. `useOnboardingStore` - 51 edges
3. `Button()` - 44 edges
4. `RuleFlowBuilder` - 42 edges
5. `Step1Account()` - 36 edges
6. `ConditionBuilder()` - 31 edges
7. `Step4Programme()` - 29 edges
8. `ConditionsPageClient()` - 28 edges
9. `Card()` - 24 edges
10. `Step3Agreement()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Detail()` --calls--> `cn()`  [EXTRACTED]
  src/app/admin/approvals/page.tsx → src/lib/utils.ts
- `AgreementStatusBadge()` --calls--> `cn()`  [EXTRACTED]
  src/app/admin/approvals/page.tsx → src/lib/utils.ts
- `AgreementStatusIcon()` --calls--> `cn()`  [EXTRACTED]
  src/app/admin/approvals/page.tsx → src/lib/utils.ts
- `StatusBadge()` --calls--> `cn()`  [EXTRACTED]
  src/app/admin/dashboard/page.tsx → src/lib/utils.ts
- `Detail()` --calls--> `cn()`  [EXTRACTED]
  src/app/admin/industry-suggestions/page.tsx → src/lib/utils.ts

## Communities (28 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (69): AdminLayout(), NAV_ITEMS, metadata, ThemeToggle(), Providers(), ActionNodeData, EventNodeData, NAV_GROUPS (+61 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (58): CreateRuleActionsPage(), FormData, schema, loyaltyRulesAdminApi, CreateRuleBasicInfoPage(), FormData, schema, CreateRuleShell() (+50 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (28): AnimatedSection(), AnimatedSectionProps, LandingPage(), items, MarketingFaq(), links, MarketingNav(), groups (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (31): ConditionBuilder(), ConditionNodeEditor(), ConditionValueEditor(), defaultLeaf(), FIELD_OPTIONS, LogicalOpSelect(), newId(), opsForType() (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (25): apiClient, original, refreshSingleFlight(), tenantConfigApi, clearSession(), getAccessToken(), setAccessToken(), INITIAL_STATE (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (20): goLiveApi, integrationApi, RuleChangeHistoryPage(), CreateRuleIndex(), GoLiveActivate, GoLiveChecklist, GoLiveChecklistItem, GoLivePage() (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (16): ConditionFlowNode, edgesFromMap(), getIncoming(), getOutgoing(), GraphValidator, newErrorId(), NodeValidator, edges (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.23
Nodes (19): ConditionFlowActions, ConditionFlowActionsProvider(), Ctx, useConditionFlowActions(), ConditionFlowErrorsProvider(), Ctx, NodeErrorLevel, useNodeErrorLevel() (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (18): Info(), TenantProfilePage(), AdminState, INITIAL_STATE, AdminRole, AgreementHistoryItem, AgreementStatus, AnnualRevenueRange (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (16): ValidationPanel(), ValidationPanelProps, toBackendConditionTree(), toBackendNode(), BuildResult, ConditionFieldMeta, ConditionFlowState, ConditionNodeData (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (15): adminApi, adminClient, blob, parsed, token, handleError(), token, ACTION_COLORS (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (15): ensureAuthSession(), programmeApiV2, ConfigurePage(), ConfigStatusBadge(), MyConfigurationsPage(), RowState, CONFIG_STEP_FIELD_GROUPS, customFieldSchema (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (14): ApiError, onboardingApi, StepActions(), StepActionsProps, StepHeader(), StepHeaderProps, IDENTITY_OPTIONS, REGION_OPTIONS (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.21
Nodes (12): Dropdown(), DropdownOption, Props, ONBOARDING_STEPS, OnboardingPage(), FormData, schema, Step3Agreement() (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (14): ActionMode, AdminIndustrySuggestionsPage(), ApprovedActiveActions(), ApprovedInactiveActions(), Detail(), FieldFreeReason(), FieldLabelOverride(), FieldRejectReason() (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.3
Nodes (10): RuleStatusBadge(), styles, FormField(), FormFieldProps, RuleStatus, Label(), Tooltip(), TooltipContent() (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (10): BuildOpts, findSingleEvent(), group(), leaf(), Literal, literalToNode(), normalizeValue(), not() (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.23
Nodes (11): asNode(), diagramFromConditionTree(), edgeId(), Literal, nnf(), NnfNode, toDnf(), a (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (12): COMMON_FIELDS, COUNTRY_EMOJI, EditFormData, editSchema, INDUSTRY_EMOJI, RegisterFormData, registerSchema, Step1Account() (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (11): ActionBadge(), ActivityTab(), AgreementsTab(), AgreementStatusBadge(), ContactsTab(), Detail(), InfoCard(), OverviewTab() (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (7): AdminApiError, AdminApprovalsPage(), AgreementStatusBadge(), AgreementStatusIcon(), Detail(), Tab, AllAgreementItem

### Community 21 - "Community 21"
Cohesion: 0.29
Nodes (6): AdminDashboardPage(), FunnelBar(), StatCard(), StatusBadge(), AdminDashboardStats, PendingAgreementListItem

### Community 22 - "Community 22"
Cohesion: 0.4
Nodes (4): AdminTenantsPage(), STATUS_FILTERS, StatusBadge(), AdminTenantListItem

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **77 isolated node(s):** `nextConfig`, `config`, `metadata`, `metadata`, `Tab` (+72 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Why does `RuleFlowBuilder` connect `Community 7` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 6`, `Community 9`, `Community 15`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `ConditionsPageClient()` connect `Community 3` to `Community 1`, `Community 4`, `Community 5`, `Community 7`, `Community 9`, `Community 15`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `nextConfig`, `config`, `metadata` to the rest of the system?**
  _77 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._