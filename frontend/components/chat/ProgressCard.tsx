"use client";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  label: string;
  complete: boolean;
  found?: number;
}

export default function ProgressCard({ label, complete, found }: Props) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 my-2 bg-white">
      <div className="flex items-center gap-2 mb-3">
        {complete ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        )}
        <span className="text-sm font-semibold text-gray-800">{label}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${complete ? "bg-emerald-500 w-full" : "bg-gray-300 w-1/3 animate-pulse"}`}
        />
      </div>
      {complete && found !== undefined && (
        <p className="text-xs text-emerald-600 mt-2">Found {found} matching jobs</p>
      )}
    </div>
  );
}
