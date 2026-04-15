"use client";

// ── AiChatPanel — AI assistant panel for document refinement ──

import { useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { DEFAULT_SHARED_CHAT_STAGE_CONFIG, toThreadTurn } from "@/lib/chat-thread-model";
import { SharedChatShell } from "@/components/chat/shared-chat-shell";
import { cn } from "@/lib/utils";

interface Props {
  workflowId: string;
  surface?: string;
  onClose?: () => void;
  className?: string;
  initialMessages?: ChatMessage[];
}

const LISTING_REVIEW_ASSISTANT_SEED: ChatMessage[] = [
  {
    id: "listing-review-guide",
    role: "assistant",
    content: "I can help you validate the parsed listing, spot missing context, and decide what to fix before starting your application packet.",
    timestamp: "seed",
    suggestions: [
      "Which listing fields should I verify first before proceeding?",
      "Help me tighten requirements into concise bullets.",
      "What should I check for compensation or employment gaps?",
    ],
  },
];

export function AiChatPanel({ workflowId, surface = "document", onClose, className, initialMessages }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingThread, setLoadingThread] = useState(true);
  const [stageKey, setStageKey] = useState<"stage2" | "support">("stage2");
  const stageConfig = DEFAULT_SHARED_CHAT_STAGE_CONFIG[stageKey];
  useEffect(() => {
    let active = true;
    const loadThread = async () => {
      setLoadingThread(true);
      try {
        const params = new URLSearchParams({ workflow_id: workflowId, surface });
        const [threadRes, workflowRes] = await Promise.all([
          fetch(`/api/ai/chat?${params.toString()}`),
          fetch(`/api/workflows/${workflowId}`),
        ]);
        const [data, workflow] = await Promise.all([threadRes.json(), workflowRes.json()]);
        if (!active) return;

        const eventTypes = Array.isArray(workflow?.status_events)
          ? workflow.status_events.map((event: { event_type: string }) => event.event_type)
          : [];
        const isApplicationSupport =
          eventTypes.includes("sent") ||
          eventTypes.includes("submitted") ||
          workflow?.state === "sent" ||
          workflow?.state === "completed";
        const nextStageKey = isApplicationSupport ? "support" : surface === "listing_review" ? "stage1" : "stage2";
        setStageKey(nextStageKey);

        if (threadRes.ok && Array.isArray(data.messages)) {
          if (data.messages.length > 0) {
            setMessages(data.messages.map((message: { id: string; role: "user" | "assistant"; content: string; created_at: string }) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              timestamp: message.created_at,
            })));
          } else {
            setMessages(
              initialMessages
                ?? (surface === "listing_review"
                  ? LISTING_REVIEW_ASSISTANT_SEED.map((message) => ({ ...message, timestamp: new Date().toISOString() }))
                  : [])
            );
          }
        }
      } finally {
        if (active) setLoadingThread(false);
      }
    };

    loadThread();
    return () => { active = false; };
  }, [workflowId, surface, initialMessages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    const includesUrl = /https?:\/\/|www\./i.test(text);
    if (includesUrl) {
      setMessages((prev) => [...prev, {
        id: `msg-url-block-${Date.now()}`,
        role: "assistant",
        content: "New listing URL intake is handled on Home. Go to Home to analyze a new listing URL, and use this chat for the current workflow.",
        timestamp: new Date().toISOString(),
      }]);
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      let provider: string | undefined;
      try {
        const stored = JSON.parse(localStorage.getItem("dreamjob_settings") ?? "{}");
        if (stored.aiProvider) provider = stored.aiProvider;
      } catch { /* ignore */ }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow_id: workflowId, message: text.trim(), surface, provider }),
      });
      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: res.ok ? data.message : (data.error ?? "Something went wrong."),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `msg-err-${Date.now()}`,
        role: "assistant",
        content: "Connection error — please try again.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={cn("flex flex-col bg-slate-50 border-l border-slate-200", className)}>
      <SharedChatShell
        messages={messages.map(toThreadTurn)}
        isTyping={isTyping}
        onSend={sendMessage}
        onSuggestion={sendMessage}
        onClose={onClose}
        headerTitle="AI Assistant"
        headerSubtitle={loadingThread ? "Loading thread…" : "Ready to help"}
        placeholder={stageConfig.placeholder}
        emptyStateText={stageConfig.emptyStateText}
        className="h-full border-0 rounded-none"
      />
    </div>
  );
}
