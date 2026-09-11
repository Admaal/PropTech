"use client";

import { useCallback, useEffect, useState } from "react";
import { pingApiHealth } from "@/lib/api-health";

export type ApiWarmupPhase = "warming" | "ready" | "offline";

export function useApiWarmup() {
  const [phase, setPhase] = useState<ApiWarmupPhase>("warming");

  const check = useCallback(async () => {
    setPhase("warming");
    const result = await pingApiHealth();
    setPhase(result.status === "ok" ? "ready" : "offline");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void check();
    }, 0);
    return () => clearTimeout(timer);
  }, [check]);

  return { phase, retry: check };
}
