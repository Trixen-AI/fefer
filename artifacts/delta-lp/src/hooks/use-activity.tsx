import { useCallback, useEffect, useState } from "react";
import {
  readActivityRecords,
  subscribeToActivity,
  type ActivityRecord,
} from "@/lib/activity-store";
import { useWallet } from "@/hooks/use-wallet";

export function useActivity() {
  const { address, onTargetNetwork } = useWallet();
  const [transactions, setTransactions] = useState<ActivityRecord[]>([]);

  const refresh = useCallback(() => {
    setTransactions(
      address && onTargetNetwork ? readActivityRecords(address) : [],
    );
  }, [address, onTargetNetwork]);

  useEffect(() => {
    refresh();
    return subscribeToActivity(refresh);
  }, [refresh]);

  return { transactions, isLoading: false, error: null, refresh };
}
