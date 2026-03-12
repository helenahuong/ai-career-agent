export interface CandidateProfile {
  name?: string;
  current_title?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    highlights?: string[];
  }>;
  education?: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  target_roles?: string[];
  location?: string;
  work_setup?: string;
  salary_min?: string;
  email?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  description?: string;
  url: string;
  remote: boolean;
  posted?: string;
  source?: string;
  logo?: string;
  fit_reason?: string;
  watch_out?: string;
}

export type MessageBlockType =
  | "text"
  | "tool_use"
  | "job_cards"
  | "profile_card"
  | "choice_options"
  | "progress_card";

export interface TextBlock {
  type: "text";
  content: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  name: string;
  label: string;
}

export interface JobCardsBlock {
  type: "job_cards";
  jobs: Job[];
}

export interface ProfileCardBlock {
  type: "profile_card";
  profile: CandidateProfile;
}

export interface ChoiceOptionsBlock {
  type: "choice_options";
  optionType: "radio" | "grid";
  options: string[];
  allow_text: boolean;
}

export interface ProgressCardBlock {
  type: "progress_card";
  label: string;
  complete: boolean;
  found?: number;
}

export type MessageBlock =
  | TextBlock
  | ToolUseBlock
  | JobCardsBlock
  | ProfileCardBlock
  | ChoiceOptionsBlock
  | ProgressCardBlock;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  blocks: MessageBlock[];
  timestamp: Date;
}
