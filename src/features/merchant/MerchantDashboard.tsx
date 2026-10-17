"use client";

import { useEffect, useState } from "react";
import { useMerchantSession } from "@/store/useMerchantSession";
import { MerchantLogin } from "./MerchantLogin";
import { MerchantOperations } from "./MerchantOperations";

export function MerchantDashboard() {
  const isAuthenticated = useMerchantSession((s) => s.isAuthenticated);
  const checkAuth = useMerchantSession((s) => s.checkAuth);
  const logout = useMerchantSession((s) => s.logout);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

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
