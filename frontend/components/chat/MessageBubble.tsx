"use client";
import ReactMarkdown from "react-markdown";
import ToolStatusChip from "./ToolStatusChip";
import JobCard from "./JobCard";
import ProfileCard from "./ProfileCard";
import ChoiceOptions from "./ChoiceOptions";
import ProgressCard from "./ProgressCard";
import type { ChatMessage } from "@/lib/types";

interface Props {
  message: ChatMessage;
  onChoiceSelect?: (value: string) => void;
  isLatest?: boolean;
}

export default function MessageBubble({ message, onChoiceSelect, isLatest }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[75%] bg-gray-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
          {message.blocks.map((b, i) =>
            b.type === "text" ? <span key={i}>{b.content}</span> : null
          )}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] w-full">
        {/* Tool chips (above message) */}
        {message.blocks
          .filter((b) => b.type === "tool_use")
          .map((b, i) =>
            b.type === "tool_use" ? (
              <ToolStatusChip key={i} label={b.label} done />
            ) : null
          )}

        {/* Message content */}
        {message.blocks.map((block, i) => {
          switch (block.type) {
            case "text":
              return (
                <div
                  key={i}
                  className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none mb-2"
                >
                  <ReactMarkdown>{block.content}</ReactMarkdown>
                </div>
              );
            case "job_cards":
              return (
                <div key={i} className="space-y-1">
                  {block.jobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              );
            case "profile_card":
              return <ProfileCard key={i} profile={block.profile} />;
            case "choice_options":
              return (
                <ChoiceOptions
                  key={i}
                  options={block.options}
                  optionType={block.optionType}
                  onSelect={onChoiceSelect || (() => {})}
                  disabled={!isLatest}
                />
              );
            case "progress_card":
              return (
                <ProgressCard
                  key={i}
                  label={block.label}
                  complete={block.complete}
                  found={block.found}
                />
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
