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
}

interface ApiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  suggestions?: string[];
  actions?: Array<{ id?: string; type: string; label: string; value?: string }>;
  warnings?: Array<{ code?: string; message: string; severity?: string }>;
}

export function AiChatPanel({ workflowId, surface = "document", onClose, className }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingThread, setLoadingThread] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [stageKey, setStageKey] = useState<"stage1" | "stage2" | "support">("stage2");
  const [seededProactiveReview, setSeededProactiveReview] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const stageConfig = DEFAULT_SHARED_CHAT_STAGE_CONFIG[stageKey];

  const copyBySurface: Partial<Record<string, { subtitle: string; placeholder: string; empty: string }>> = {
    listing_review: {
      subtitle: "Listing review assistant",
      placeholder: "Ask about listing quality, gaps, and parsing fixes…",
      empty: "Validate the listing context before starting your application workflow.",
    },
    resume_workspace: {
      subtitle: "Resume editing assistant",
      placeholder: "Ask for resume bullet, summary, or section edits…",
      empty: "Use chat to co-edit resume content directly in this workspace.",
    },
    cover_letter_workspace: {
      subtitle: "Cover letter assistant",
      placeholder: "Ask for cover-letter tone, structure, and rewrite edits…",
      empty: "Use chat to refine your cover letter for this role.",
    },
    application_hub_support: {
      subtitle: "Application hub assistant",
      placeholder: "Ask for workflow next steps, follow-ups, and packet readiness…",
      empty: "Use support to plan next actions for this application workflow.",
    },
    follow_up_support: {
      subtitle: "Follow-up assistant",
      placeholder: "Ask for follow-up timing, outreach wording, and cadence…",
      empty: "Use this support thread to plan post-submission follow-up.",
    },
    interview_guide: {
      subtitle: "Interview guide assistant",
      placeholder: "Ask for interview stories, prep questions, and talking points…",
      empty: "Use chat to strengthen your interview prep for this role.",
    },
    negotiation_guide: {
      subtitle: "Negotiation guide assistant",
      placeholder: "Ask for offer analysis and negotiation strategy help…",
      empty: "Use chat to plan negotiation talking points and counters.",
    },
  };
  const surfaceCopy = copyBySurface[surface];

  const mapApiMessage = (message: ApiMessage): ChatMessage => ({
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.created_at,
    suggestions: message.suggestions ?? [],
    actions: (message.actions ?? []).map((action, index) => ({
      id: action.id ?? `action-${message.id}-${index}`,
      type: action.type,
      label: action.label,
      value: action.value,
    })),
    warnings: message.warnings ?? [],
  });

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
            setMessages(data.messages.map((message: ApiMessage) => mapApiMessage(message)));
          } else {
            setMessages([]);
          }
        } else {
          setRequestError(data?.error ?? "Unable to load thread.");
        }
      } finally {
        if (active) setLoadingThread(false);
      }
    };

    loadThread();
    return () => {
      active = false;
    };
  }, [workflowId, surface]);

  useEffect(() => {
    const shouldSeed = surface === "listing_review" && !loadingThread && messages.length === 0 && !seededProactiveReview;
    if (!shouldSeed) return;
    setSeededProactiveReview(true);
    setIsTyping(true);
    fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow_id: workflowId, surface }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.message) return;
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-proactive`,
            role: "assistant",
            content: data.message,
            timestamp: new Date().toISOString(),
            suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
            actions: Array.isArray(data.actions) ? data.actions : [],
            warnings: Array.isArray(data.warnings) ? data.warnings : [],
          },
        ]);
      })
      .finally(() => setIsTyping(false));
  }, [workflowId, surface, loadingThread, messages, seededProactiveReview]);

  useEffect(() => {
    if (surface !== "listing_review") return;
    const handleListingSaved = () => {
      if (isTyping) return;
      setIsTyping(true);
      fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow_id: workflowId, surface }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data?.message) return;
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-refresh`,
              role: "assistant",
              content: data.message,
              timestamp: new Date().toISOString(),
              suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
              actions: Array.isArray(data.actions) ? data.actions : [],
              warnings: Array.isArray(data.warnings) ? data.warnings : [],
            },
          ]);
        })
        .finally(() => setIsTyping(false));
    };
    window.addEventListener("dreamjob:listing-saved", handleListingSaved);
    return () => window.removeEventListener("dreamjob:listing-saved", handleListingSaved);
  }, [workflowId, surface, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    setRequestError(null);
    const includesUrl = /https?:\/\/|www\./i.test(text);
    if (includesUrl) {
      setRequestError("New listing URL intake is handled on Home. Go to Home to analyze a new listing URL, and use this chat for the current workflow.");
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
      } catch {
        /* ignore */
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow_id: workflowId, message: text.trim(), surface, provider }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRequestError(data.error ?? "Something went wrong.");
        return;
      }
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: data.message,
        timestamp: new Date().toISOString(),
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        actions: Array.isArray(data.actions) ? data.actions : [],
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setRequestError("Connection error — please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-slate-50 border-l border-slate-200",
        expanded && "lg:fixed lg:inset-y-0 lg:right-0 lg:z-50 lg:w-[min(720px,88vw)] lg:shadow-2xl",
        className
      )}
    >
      <SharedChatShell
        messages={messages.map(toThreadTurn)}
        isTyping={isTyping}
        onSend={sendMessage}
        onSuggestion={sendMessage}
        onClose={onClose}
        onToggleExpand={() => setExpanded((value) => !value)}
        expanded={expanded}
        headerTitle="AI Assistant"
        headerSubtitle={loadingThread ? "Loading thread…" : (requestError ?? `${surfaceCopy?.subtitle ?? "Workflow assistant"} · ${stageConfig.stage.toUpperCase()}`)}
        placeholder={surfaceCopy?.placeholder ?? stageConfig.placeholder}
        emptyStateText={surfaceCopy?.empty ?? stageConfig.emptyStateText}
        className="h-full border-0 rounded-none"
      />
    </div>
  );
}
