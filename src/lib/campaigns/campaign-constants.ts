/** Internal programme key — campaigns are tenant-scoped; programme is not shown in UI. */
export const CAMPAIGN_DEFAULT_PROGRAMME_UID = "default";

/** Stored when campaign type is not collected in the form. */
export const CAMPAIGN_DEFAULT_TYPE = "STANDARD";

/** Default offer when offer is not configured in the UI (backend requires offerConfig). */
export const CAMPAIGN_DEFAULT_OFFER = {
  awardType: "POINTS_BONUS" as const,
  bonusPoints: 50,
  stackableWithRules: true,
};
