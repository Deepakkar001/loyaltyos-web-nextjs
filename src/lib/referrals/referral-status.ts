/** Human-readable labels for referral row status (API enum values). */
export function referralStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "SIGNED_UP":
      return "Signed up";
    case "REWARDED":
      return "Rewarded";
    case "FRAUD_FLAGGED":
      return "Fraud flagged";
    case "REJECTED":
      return "Rejected";
    default:
      return status.replace(/_/g, " ").toLowerCase();
  }
}

export const REFERRAL_STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "SIGNED_UP", label: "Signed up" },
  { value: "REWARDED", label: "Rewarded" },
  { value: "FRAUD_FLAGGED", label: "Fraud flagged" },
  { value: "REJECTED", label: "Rejected" },
];
