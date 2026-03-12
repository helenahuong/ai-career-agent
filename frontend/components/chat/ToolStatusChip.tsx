"use client";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  label: string;
  done?: boolean;
}

export default function ToolStatusChip({ label, done = true }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-2.5 py-1 rounded-full mr-2 mb-1">
      {done ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin" />
      )}
      {label}
    </span>
  );
}
