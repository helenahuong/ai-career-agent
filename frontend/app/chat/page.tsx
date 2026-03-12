import { Suspense } from "react";
import ChatPageClient from "./ChatPageClient";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-400 text-sm">Loading...</div>}>
      <ChatPageClient />
    </Suspense>
  );
}
