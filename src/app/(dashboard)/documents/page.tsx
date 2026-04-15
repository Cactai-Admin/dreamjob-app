"use client";

import Link from "next/link";

export default function DocumentsPage() {
  return (
    <div className="page-wrapper max-w-1000px">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Documents</h1>
      <p className="text-sm text-slate-500 mb-4">Document work remains tied to active applications in this pass.</p>
      <Link href="/jobs" className="btn-ocean inline-flex px-4 py-2 text-sm">Open Applications</Link>
    </div>
  );
}
