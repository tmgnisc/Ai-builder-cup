"use client";

import { useEffect, useState } from "react";
import { useMerchantSession } from "@/store/useMerchantSession";
import { MerchantLogin } from "./MerchantLogin";
import { MerchantOperations } from "./MerchantOperations";

export function MerchantDashboard() {
  const isAuthenticated = useMerchantSession((s) => s.isAuthenticated);
  const login = useMerchantSession((s) => s.login);
  const logout = useMerchantSession((s) => s.logout);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check persisted auth or demo flag in query params
    if (typeof window !== "undefined") {
      const isSaved = localStorage.getItem("persona_merchant_auth") === "true";
      const params = new URLSearchParams(window.location.search);
      const isDemo = params.get("demo") === "true";

      if ((isSaved || isDemo) && !isAuthenticated) {
        login("admin@persona.store");
      }
    }
  }, [isAuthenticated, login]);

  // Avoid flash during SSR hydration
  if (!mounted) {
    return (
      <div className="mx-auto max-w-page px-4 py-20 text-center text-xs text-muted">
        Loading merchant portal...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <MerchantLogin onSuccess={() => {}} />;
  }

  return <MerchantOperations onLogout={logout} />;
}
