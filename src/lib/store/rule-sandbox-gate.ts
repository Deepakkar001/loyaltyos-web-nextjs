import { createExpiringLocalStorage } from "@/lib/store/expiring-storage";

const storage = typeof window === "undefined" ? null : createExpiringLocalStorage(30 * 24 * 60 * 60 * 1000);

type Gate = {
  passed: boolean;
  passedAt: string;
  lastTxnId?: string;
  lastPoints?: number;
};

function key(tenantId: string, programmeUid: string, ruleUid: string) {
  return `rule-sandbox-pass:${tenantId}:${programmeUid}:${ruleUid}`;
}

export function markSandboxPassed(tenantId: string, programmeUid: string, ruleUid: string, gate: Gate) {
  if (!storage) return;
  storage.setItem(key(tenantId, programmeUid, ruleUid), JSON.stringify(gate));
}

export function getSandboxGate(tenantId: string, programmeUid: string, ruleUid: string): Gate | null {
  if (!storage) return null;
  const raw = storage.getItem(key(tenantId, programmeUid, ruleUid));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Gate;
  } catch {
    storage.removeItem(key(tenantId, programmeUid, ruleUid));
    return null;
  }
}

export function clearSandboxGate(tenantId: string, programmeUid: string, ruleUid: string) {
  if (!storage) return;
  storage.removeItem(key(tenantId, programmeUid, ruleUid));
}

