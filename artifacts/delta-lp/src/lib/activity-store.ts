const STORAGE_PREFIX = "delta-lp:activity";
const ACTIVITY_EVENT = "delta-lp-activity";
const MAX_RECORDS = 100;

export type ActivityRecord = {
  id: string;
  address: string;
  hash: string;
  label: string;
  contract: string;
  timestamp: number;
};

function storageKey(address: string) {
  return `${STORAGE_PREFIX}:${address.toLowerCase()}`;
}

export function readActivityRecords(address: string) {
  try {
    const value = window.localStorage.getItem(storageKey(address));
    const parsed = value ? (JSON.parse(value) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as ActivityRecord[]) : [];
  } catch {
    return [];
  }
}

export function recordActivity(
  input: Omit<ActivityRecord, "id" | "timestamp">,
) {
  const record: ActivityRecord = {
    ...input,
    id: `${input.hash}:${input.label}`,
    timestamp: Date.now(),
  };
  const next = [
    record,
    ...readActivityRecords(input.address).filter((item) => item.id !== record.id),
  ].slice(0, MAX_RECORDS);
  window.localStorage.setItem(storageKey(input.address), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT));
}

export function subscribeToActivity(listener: () => void) {
  window.addEventListener(ACTIVITY_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(ACTIVITY_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}