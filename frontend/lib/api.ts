const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createSession(): Promise<string> {
  const res = await fetch(`${API_BASE}/chat/session`, { method: "POST" });
  const data = await res.json();
  return data.session_id;
}

export async function getSession(sessionId: string) {
  const res = await fetch(`${API_BASE}/chat/session/${sessionId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function uploadResume(
  sessionId: string,
  file: File,
): Promise<{ success: boolean; profile: Record<string, unknown> }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/resume/upload/${sessionId}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Resume upload failed");
  return res.json();
}

export function streamChat(
  sessionId: string,
  message: string,
  coachingMode: boolean,
  onChunk: (event: Record<string, unknown>) => void,
  onDone: () => void,
): () => void {
  const controller = new AbortController();

  fetch(`${API_BASE}/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      message,
      coaching_mode: coachingMode,
    }),
    signal: controller.signal,
  })
    .then(async (res) => {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (!data) continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "done") {
                onDone();
              } else {
                onChunk(parsed);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (err.name !== "AbortError") console.error("Stream error:", err);
      onDone();
    });

  return () => controller.abort();
}
