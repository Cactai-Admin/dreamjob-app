"use client";

// ── New Job — Redirects to Home intake surface ─────
// The job creation workflow is now handled on /home.
// This redirect handles any direct links to /jobs/new.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewJobRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home");
  }, [router]);

  return (
    <div className="page-wrapper flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Redirecting…</p>
      </div>
    </div>
  );
}
