"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { createSession, streamChat, uploadResume } from "@/lib/api";
import { parseAssistantText } from "@/lib/parseMessage";
import type { ChatMessage, MessageBlock } from "@/lib/types";

interface Props {
  initialMessage?: string;
}

export default function ChatInterface({ initialMessage }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [coachingMode, setCoachingMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);
  const streamBufferRef = useRef<string>("");
  const streamingMsgIdRef = useRef<string | null>(null);
  const sentInitialRef = useRef(false);

  // Initialize session
  useEffect(() => {
    createSession().then((id) => {
      setSessionId(id);
    });
  }, []);

  // Send initial message once session is ready
  useEffect(() => {
    if (sessionId && initialMessage && !sentInitialRef.current) {
      sentInitialRef.current = true;
      setTimeout(() => sendMessage(initialMessage), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, initialMessage]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!sessionId || streaming) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: uuidv4(),
        role: "user",
        blocks: [{ type: "text", content: text }],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Create placeholder for assistant response
      const assistantMsgId = uuidv4();
      streamingMsgIdRef.current = assistantMsgId;
      streamBufferRef.current = "";

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        blocks: [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreaming(true);

      // SSE event handlers
      const handleChunk = (event: Record<string, unknown>) => {
        if (event.type === "text_chunk") {
          streamBufferRef.current += (event.text as string) || "";
          // Re-parse the accumulated text into blocks
          const blocks = parseAssistantText(streamBufferRef.current);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, blocks } : m
            )
          );
        } else if (event.type === "tool_use") {
          // Insert tool chip into blocks
          const chip: MessageBlock = {
            type: "tool_use",
            name: (event.name as string) || "",
            label: (event.label as string) || "",
          };
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, blocks: [...m.blocks.filter((b) => b.type === "tool_use"), chip] }
                : m
            )
          );
        } else if (event.type === "progress_card") {
          const progressBlock: MessageBlock = {
            type: "progress_card",
            label: (event.label as string) || "",
            complete: (event.complete as boolean) || false,
            found: event.found as number | undefined,
          };
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    blocks: [
                      ...m.blocks.filter((b) => b.type !== "progress_card"),
                      progressBlock,
                    ],
                  }
                : m
            )
          );
        }
      };

      const handleDone = () => {
        setStreaming(false);
        streamingMsgIdRef.current = null;
        // Final parse to ensure clean blocks
        if (streamBufferRef.current) {
          const finalBlocks = parseAssistantText(streamBufferRef.current);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, blocks: finalBlocks } : m
            )
          );
        }
      };

      const cancel = streamChat(
        sessionId,
        text,
        coachingMode,
        handleChunk,
        handleDone
      );
      cancelStreamRef.current = cancel;
    },
    [sessionId, streaming, coachingMode]
  );

  const handleFileUpload = async (file: File) => {
    if (!sessionId) return;
    setUploading(true);

    // Show user message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: "user",
      blocks: [{ type: "text", content: `📄 Uploading resume: ${file.name}` }],
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const result = await uploadResume(sessionId, file);
      if (result.success) {
        // Notify the agent about the uploaded resume
        sendMessage(`I've uploaded my resume (${file.name}). Please analyze it and help me find relevant jobs.`);
      }
    } catch {
      const errMsg: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        blocks: [{ type: "text", content: "Sorry, I couldn't read that file. Please try a PDF or DOCX under 5MB." }],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setUploading(false);
    }
  };

  const handleChoiceSelect = (value: string) => {
    sendMessage(value);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold">
          A
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Aria</p>
          <p className="text-xs text-gray-400">AI Career Agent</p>
        </div>
        {coachingMode && (
          <span className="ml-auto bg-emerald-100 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full border border-emerald-200">
            Coaching mode
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {messages.length === 0 && !streaming && (
          <div className="text-center text-gray-400 text-sm mt-20">
            <p className="text-2xl mb-2">👋</p>
            <p>Starting your session...</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onChoiceSelect={handleChoiceSelect}
            isLatest={i === messages.length - 1}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white px-4 py-3">
        <ChatInput
          onSend={sendMessage}
          onFileUpload={handleFileUpload}
          coachingMode={coachingMode}
          onToggleCoaching={() => setCoachingMode(!coachingMode)}
          disabled={streaming || !sessionId}
          uploading={uploading}
        />
      </div>
    </div>
  );
}
