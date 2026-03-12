"use client";
import { useSearchParams } from "next/navigation";
import ChatInterface from "@/components/chat/ChatInterface";

export default function ChatPageClient() {
  const params = useSearchParams();
  const initialMessage = params.get("q") || undefined;

  return <ChatInterface initialMessage={initialMessage} />;
}
