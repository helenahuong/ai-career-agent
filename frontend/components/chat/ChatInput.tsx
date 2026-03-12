"use client";
import { useRef, useState, KeyboardEvent } from "react";
import { Paperclip, Send, Loader2, GraduationCap } from "lucide-react";

interface Props {
  onSend: (message: string) => void;
  onFileUpload: (file: File) => void;
  coachingMode: boolean;
  onToggleCoaching: () => void;
  disabled?: boolean;
  uploading?: boolean;
}

export default function ChatInput({
  onSend,
  onFileUpload,
  coachingMode,
  onToggleCoaching,
  disabled,
  uploading,
}: Props) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
    e.target.value = "";
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  const placeholder = coachingMode
    ? "Answer the interview question..."
    : "Ask Aria anything...";

  return (
    <div className="border border-gray-200 rounded-2xl bg-white shadow-sm px-3 py-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKey}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className="w-full resize-none text-sm text-gray-800 placeholder-gray-400 outline-none leading-relaxed bg-transparent disabled:opacity-50 py-1"
        style={{ maxHeight: "150px" }}
      />
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          {/* Resume upload */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={disabled || uploading}
            title="Upload resume"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Coaching mode toggle */}
          <button
            onClick={onToggleCoaching}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full transition-all ${
              coachingMode
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-gray-100 text-gray-500 border border-transparent hover:border-gray-200"
            }`}
          >
            <GraduationCap className="w-3 h-3" />
            Coaching
          </button>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {disabled ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
