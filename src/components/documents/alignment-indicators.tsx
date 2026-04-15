"use client";

interface Props {
  title?: string;
}

const INDICATORS = [
  { key: "ats", label: "ATS", score: 78 },
  { key: "recruiter", label: "Recruiter", score: 72 },
  { key: "hiring", label: "Hiring Manager", score: 69 },
];

export function AlignmentIndicators({ title = "Alignment Indicators" }: Props) {
  return (
    <div className="card-base p-4 mb-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">{title}</div>
      <div className="space-y-2.5">
        {INDICATORS.map((item) => (
          <div key={item.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>{item.label}</span>
              <span className="font-semibold text-slate-800">{item.score}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: `${item.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
