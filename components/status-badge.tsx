import type { LeadStatus } from "@/lib/types";

const labels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  not_interested: "Not interested",
  callback: "Callback",
  closed: "Closed"
};

const colors: Record<LeadStatus, string> = {
  new: "border-slate-500/40 bg-slate-500/10 text-slate-200",
  contacted: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  interested: "border-mint/40 bg-mint/10 text-mint",
  not_interested: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  callback: "border-amber/40 bg-amber/10 text-amber",
  closed: "border-zinc-400/40 bg-zinc-400/10 text-zinc-200"
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}
