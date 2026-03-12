"use client";
import { useState } from "react";
import { ExternalLink, MapPin, DollarSign, ChevronDown, ChevronUp, Wifi } from "lucide-react";
import type { Job } from "@/lib/types";

interface Props {
  job: Job;
}

export default function JobCard({ job }: Props) {
  const [expanded, setExpanded] = useState(false);
  const initials = job.company.slice(0, 2).toUpperCase();

  return (
    <div className="border border-gray-200 rounded-xl p-4 my-2 bg-white hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0 overflow-hidden">
          {job.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={job.logo} alt={job.company} className="w-full h-full object-contain p-1" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-gray-900 hover:text-emerald-700 flex items-center gap-1 group"
          >
            {job.title}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
            {job.company}
            {job.source && (
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                job.source === "LinkedIn"
                  ? "bg-blue-600 text-white"
                  : job.source === "Indeed"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {job.source}
              </span>
            )}
            · {job.posted ? `Posted ${new Date(job.posted).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Recently posted"}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
          <MapPin className="w-2.5 h-2.5" />
          {job.location}
          {job.remote && " · Remote"}
        </span>
        {job.remote && (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full">
            <Wifi className="w-2.5 h-2.5" />
            Remote
          </span>
        )}
        {job.salary && (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full">
            <DollarSign className="w-2.5 h-2.5" />
            {job.salary}
          </span>
        )}
      </div>

      {/* AI Analysis */}
      {job.fit_reason && (
        <div className="border-l-2 border-emerald-400 pl-3 mb-2">
          <p className="text-xs font-semibold text-gray-700 mb-0.5">Why this is a fit</p>
          <p className="text-xs text-gray-600">{job.fit_reason}</p>
        </div>
      )}
      {job.watch_out && (
        <div className="border-l-2 border-amber-400 pl-3 mb-3">
          <p className="text-xs font-semibold text-gray-700 mb-0.5">What to watch out for</p>
          <p className="text-xs text-gray-600">{job.watch_out}</p>
        </div>
      )}

      {/* Description toggle */}
      {job.description && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Less" : "More details"}
          </button>
          {expanded && (
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">{job.description}</p>
          )}
        </div>
      )}

      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700 transition-colors"
      >
        View Job →
      </a>
    </div>
  );
}
