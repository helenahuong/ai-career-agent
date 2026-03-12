"use client";
import { useState } from "react";
import { User, ChevronDown, ChevronUp } from "lucide-react";
import type { CandidateProfile } from "@/lib/types";

interface Props {
  profile: CandidateProfile;
}

export default function ProfileCard({ profile }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden my-2 bg-white">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <User className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-800">Candidate Profile</span>
      </div>
      <div className="p-4">
        {profile.name && (
          <p className="font-semibold text-gray-900">{profile.name}</p>
        )}
        {profile.current_title && (
          <p className="text-sm text-gray-500 mb-2">{profile.current_title}</p>
        )}
        {profile.summary && (
          <p className="text-sm text-gray-700 leading-relaxed mb-3">{profile.summary}</p>
        )}

        {profile.skills && profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {profile.skills.slice(0, 8).map((skill) => (
              <span key={skill} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                {skill}
              </span>
            ))}
          </div>
        )}

        {expanded && profile.experience && profile.experience.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Work Experience</p>
            {profile.experience.map((exp, i) => (
              <div key={i} className="mb-2">
                <p className="text-sm font-medium text-gray-800">{exp.title} — {exp.company}</p>
                <p className="text-xs text-gray-500">{exp.duration}</p>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-2 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Show less" : "Show more"}
        </button>
      </div>
    </div>
  );
}
