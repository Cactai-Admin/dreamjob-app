"use client";

import { useMemo, useState } from "react";
import { SharedChatShell } from "@/components/chat/shared-chat-shell";
import type { ChatThreadTurn } from "@/lib/chat-thread-model";

interface Props {
  mode: "profile" | "career";
}

const PROFILE_SUGGESTIONS = [
  "Help me strengthen my profile summary for current roles.",
  "Which profile section should I update next for better application readiness?",
  "Turn my latest experience into stronger resume bullets.",
];

const CAREER_SUGGESTIONS = [
  "Help me define a realistic 90-day advancement plan.",
  "What evidence should I collect for my next role target?",
  "Build a skill-gap checklist for my target title.",
];

export function WorkspaceAssistantRail({ mode }: Props) {
  const [messages, setMessages] = useState<ChatThreadTurn[]>([]);

  const config = useMemo(() => {
    if (mode === "profile") {
      return {
        subtitle: "Profile refinement guidance",
        placeholder: "Ask for profile editing and readiness guidance…",
        emptyState:
          "I can help tighten your profile sections, identify weak spots, and suggest the best next profile updates.",
        suggestions: PROFILE_SUGGESTIONS,
      };
    }
    return {
      subtitle: "Career advancement guidance",
      placeholder: "Ask for advancement planning and skill-gap guidance…",
      emptyState:
        "I can help you define growth targets, clarify next milestones, and structure a practical advancement plan.",
      suggestions: CAREER_SUGGESTIONS,
    };
  }, [mode]);

  const sendMessage = async (text: string) => {
    const userTurn: ChatThreadTurn = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const assistantTurn: ChatThreadTurn = {
      id: `assistant-${Date.now() + 1}`,
      role: "assistant",
      content: mode === "profile"
        ? "Great prompt. I can help rewrite this for clarity and impact. Share the section text you want to improve, and I’ll provide a tighter draft plus 2 alternatives."
        : "Great direction. I can break this into goals, milestones, and evidence checkpoints so your advancement plan stays practical and measurable.",
      createdAt: new Date().toISOString(),
      suggestions: config.suggestions,
    };
    setMessages((prev) => [...prev, userTurn, assistantTurn]);
  };

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <SharedChatShell
        messages={messages}
        onSend={sendMessage}
        onSuggestion={sendMessage}
        className="h-full border-0 rounded-none"
        headerTitle="AI Assistant"
        headerSubtitle={config.subtitle}
        placeholder={config.placeholder}
        emptyStateText={config.emptyState}
      />
    </div>
  );
}
