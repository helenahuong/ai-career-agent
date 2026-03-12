import type { MessageBlock } from "./types";

/**
 * Parse the raw text returned by the AI (accumulated from text_chunks)
 * into an array of MessageBlocks for rendering.
 *
 * The AI embeds special XML-like tags:
 *   <tool_use>{...}</tool_use>
 *   <job_cards>{...}</job_cards>
 *   <profile_card>{...}</profile_card>
 *   <choice_options>{...}</choice_options>
 *   <progress_card>{...}</progress_card>
 */
export function parseAssistantText(raw: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  const tagPattern =
    /<(tool_use|job_cards|profile_card|choice_options|progress_card)>([\s\S]*?)<\/\1>/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(raw)) !== null) {
    // Text before this tag
    const before = raw.slice(lastIndex, match.index).trim();
    if (before) {
      blocks.push({ type: "text", content: before });
    }

    const tagName = match[1];
    const jsonStr = match[2].trim();

    try {
      const data = JSON.parse(jsonStr);
      switch (tagName) {
        case "tool_use":
          blocks.push({ type: "tool_use", name: data.name, label: data.label });
          break;
        case "job_cards":
          blocks.push({ type: "job_cards", jobs: data.jobs || [] });
          break;
        case "profile_card":
          blocks.push({ type: "profile_card", profile: data });
          break;
        case "choice_options":
          blocks.push({
            type: "choice_options",
            optionType: data.type || "radio",
            options: data.options || [],
            allow_text: data.allow_text ?? true,
          });
          break;
        case "progress_card":
          blocks.push({
            type: "progress_card",
            label: data.label,
            complete: data.complete,
            found: data.found,
          });
          break;
      }
    } catch {
      // If JSON parse fails, treat as text
      blocks.push({ type: "text", content: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  const tail = raw.slice(lastIndex).trim();
  if (tail) {
    blocks.push({ type: "text", content: tail });
  }

  return blocks.length > 0 ? blocks : [{ type: "text", content: raw }];
}
