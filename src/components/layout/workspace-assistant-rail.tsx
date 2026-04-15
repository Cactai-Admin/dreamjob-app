"use client";

import { useMemo } from "react";
import { SharedChatShell } from "@/components/chat/shared-chat-shell";
import type { ChatThreadTurn } from "@/lib/chat-thread-model";

interface Props {
  mode: "profile" | "career";
}

export function WorkspaceAssistantRail({ mode }: Props) {
  const messages: ChatThreadTurn[] = [];

  const config = useMemo(() => {
    if (mode === "profile") {
      return {
        subtitle: "Profile refinement guidance",
        placeholder: "Ask for profile editing and readiness guidance…",
        emptyState:
          "Start from an active workflow workspace to use OpenAI-driven assistant guidance for profile updates.",
      };
    }
    return {
      subtitle: "Career advancement guidance",
      placeholder: "Ask for advancement planning and skill-gap guidance…",
      emptyState:
        "Start from an active workflow workspace to use OpenAI-driven assistant guidance for career planning.",
    };
  }, [mode]);


  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <SharedChatShell
        messages={messages}
        className="h-full border-0 rounded-none"
        headerTitle="AI Assistant"
        headerSubtitle={config.subtitle}
        placeholder={config.placeholder}
        emptyStateText={config.emptyState}
        inputEnabled={false}
      />
    </div>
  );
}
