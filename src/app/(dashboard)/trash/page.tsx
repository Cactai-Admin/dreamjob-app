"use client";

// ── Trash — Deleted items with 30-day recovery ────────────

import { useState, useEffect } from "react";
import { Trash2, RotateCcw, X, TriangleAlert as AlertTriangle, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

interface DeletedItem {
  id: string;
  item_type: string;
  item_id: string;
  item_data: Record<string, unknown>;
  expires_at: string;
  created_at?: string;
}

function getDaysRemaining(expiresAt: string): number {
  const expires = new Date(expiresAt);
  const now = new Date();
  const days = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

function getItemLabel(item: DeletedItem): { title: string; subtitle: string } {
  const data = item.item_data;
  if (item.item_type === "workflow") {
    const title = (data.title as string) ?? "Untitled Application";
    const [company, position] = title.includes(" - ") ? title.split(" - ") : [title, ""];
    return { title: position || title, subtitle: company };
  }
  return { title: `${item.item_type} (${item.item_id.slice(0, 8)})`, subtitle: item.item_type };
}

export default function TrashPage() {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/deleted-items")
      .then(r => r.json())
      .then((data: DeletedItem[]) => {
        if (Array.isArray(data)) setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleRestore = async (id: string) => {
    setRestoredIds(prev => new Set(Array.from(prev).concat(id)));
    const res = await fetch(`/api/deleted-items/${id}`, { method: "POST" });
    if (res.ok) {
      setTimeout(() => {
        setItems(prev => prev.filter(i => i.id !== id));
        setRestoredIds(prev => { const next = new Set(Array.from(prev)); next.delete(id); return next; });
      }, 1200);
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not restore item.");
      setRestoredIds(prev => { const next = new Set(Array.from(prev)); next.delete(id); return next; });
    }
  };

  const handleDeletePermanently = async (id: string) => {
    await fetch(`/api/deleted-items/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const emptyTrash = async () => {
    await Promise.all(items.map(i => fetch(`/api/deleted-items/${i.id}`, { method: "DELETE" })));
    setItems([]);
  };

  return (
    <div className="page-wrapper max-w-800px">
      <PageHeader title="Trash" subtitle="Items are permanently deleted after 30 days" />

      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Deleted items are kept for <strong>30 days</strong> before permanent deletion. Restore them anytime before they expire.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">Trash is empty</h3>
          <p className="text-slate-400 text-sm">No deleted items to recover.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const { title, subtitle } = getItemLabel(item);
            const daysLeft = getDaysRemaining(item.expires_at);
            const isRestored = restoredIds.has(item.id);

            return (
              <div
                key={item.id}
                className={cn("card-base p-4 transition-all duration-500", isRestored && "opacity-0 scale-95")}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-500 font-bold">
                    {title[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-700 text-sm line-through decoration-slate-300 truncate">{title}</h3>
                        <p className="text-slate-400 text-xs">{subtitle}</p>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize flex-shrink-0">
                        {item.item_type}
                      </span>
                    </div>
                    <div className={cn("flex items-center gap-1.5 mt-2 text-xs font-medium", daysLeft <= 7 ? "text-red-600" : "text-amber-600")}>
                      <Clock className="w-3 h-3" />
                      {daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left to recover`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleRestore(item.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {isRestored ? "Restoring…" : "Restore"}
                  </button>
                  <button
                    onClick={() => handleDeletePermanently(item.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Delete permanently
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-5 pt-5 border-t border-slate-200">
          <button onClick={emptyTrash} className="text-sm text-red-600 hover:underline flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />
            Empty trash ({items.length} item{items.length !== 1 ? "s" : ""})
          </button>
        </div>
      )}
    </div>
  );
}
