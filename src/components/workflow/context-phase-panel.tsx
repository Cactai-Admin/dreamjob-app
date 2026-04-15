import { cn } from "@/lib/utils";

interface Props {
  phase: number;
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: string }>;
}

export function ContextPhasePanel({ phase, title, subtitle, items }: Props) {
  return (
    <div className="card-base p-4 border-sky-100 bg-sky-50/30">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-600 mb-1">Phase {phase}</p>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mb-3">{subtitle}</p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="grid grid-cols-5 gap-2 text-xs">
            <span className="col-span-2 text-slate-500">{item.label}</span>
            <span className={cn("col-span-3 text-slate-700 truncate", !item.value && "text-slate-400")}>{item.value || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
