"use client";
import { useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

const COMPANIES = [
  "OpenAI", "Anthropic", "Cursor", "Figma", "Linear", "Notion",
  "Vercel", "Stripe", "Retool", "Replit", "Perplexity", "Mistral",
];

export default function HeroInput() {
  const [value, setValue] = useState("");
  const router = useRouter();

  const handleStart = () => {
    const q = value.trim();
    if (!q) return;
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleStart();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <p className="text-xs text-gray-400 mb-2">Describe your dream job</p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          rows={3}
          placeholder="Product Manager at an AI startup in London, open to hybrid roles, ideally Series A–C..."
          className="w-full resize-none text-base text-gray-800 placeholder-gray-300 outline-none leading-relaxed"
        />
        <div className="flex items-end justify-between mt-3">
          {/* Company logos strip */}
          <div className="flex flex-col">
            <p className="text-xs text-gray-400 mb-1.5">Find jobs at companies like</p>
            <div className="flex gap-2 flex-wrap">
              {COMPANIES.slice(0, 6).map((c) => (
                <span key={c} className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!value.trim()}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 ml-4"
          >
            Talk to Aria
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-4 justify-center text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400">✓</span>
          Jobs in 10 minutes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400">✓</span>
          No credit card
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400">✓</span>
          Your data stays private
        </span>
      </div>
    </div>
  );
}
