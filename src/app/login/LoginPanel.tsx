"use client";

import { useState } from "react";
import { AuthCard, type AuthTab } from "@/components/auth/AuthCard";

/** The auth card on its own page. It only needs to remember which tab is open. */
export function LoginPanel({ next }: { next?: string }) {
  const [tab, setTab] = useState<AuthTab>("login");
  return <AuthCard tab={tab} onTabChange={setTab} next={next} />;
}
