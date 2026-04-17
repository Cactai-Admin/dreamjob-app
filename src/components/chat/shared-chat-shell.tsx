"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Expand, Minimize2, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatThreadTurn, ThreadAction } from "@/lib/chat-thread-model";

interface Props {
  messages: ChatThreadTurn[];
  isTyping?: boolean;
  onSend?: (text: string) => void | Promise<void>;
  onSuggestion?: (text: string) => void;
  onAction?: (action: ThreadAction) => void;
  className?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  placeholder?: string;
  emptyStateText?: string;
  inputEnabled?: boolean;
  onClose?: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

function renderRichText(content: string) {
  return content
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br/>");
}

function TypingIndicator() {
  return (
    <div className="px-1 py-2">
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

function ActionButtons({ actions, onAction }: { actions: ThreadAction[]; onAction?: (action: ThreadAction) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction?.(action)}
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {warnings.map((warning, index) => (
        <div key={`${warning}-${index}`} className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>{warning}</p>
        </div>
      ))}
    </div>
  );
}

function TranscriptRow({
  message,
  onSuggestion,
  onAction,
}: {
  message: ChatThreadTurn;
  onSuggestion?: (text: string) => void;
  onAction?: (action: ThreadAction) => void;
}) {
  const isUser = message.role === "user";
  const warnings = Array.isArray(message.metadata?.warnings)
    ? (message.metadata?.warnings as string[])
    : [];

  return (
    <article className="border-b border-slate-100 px-1 py-3 last:border-b-0">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {isUser ? "You" : "Assistant"}
      </p>
      <div
        className={cn(
          "text-sm leading-6 text-slate-800",
          isUser && "text-slate-900"
        )}
        dangerouslySetInnerHTML={{ __html: renderRichText(message.content) }}
      />

      {message.suggestions && message.suggestions.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Suggestions</p>
          <div className="flex flex-wrap gap-2">
            {message.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSuggestion?.(suggestion)}
                className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <WarningList warnings={warnings} />

      {message.actions && message.actions.length > 0 && <ActionButtons actions={message.actions} onAction={onAction} />}
    </article>
  );
}

export function SharedChatShell({
  messages,
  isTyping = false,
  onSend,
  onSuggestion,
  onAction,
  className,
  headerTitle = "AI Assistant",
  headerSubtitle = "Ready to help",
  placeholder = "Send a message…",
  emptyStateText = "Start a conversation.",
  inputEnabled = true,
  onClose,
  expanded = false,
  onToggleExpand,
}: Props) {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!onSend || !text.trim()) return;
    const message = text;
    setInput("");
    try {
      await onSend(message);
    } catch {
      setInput(message);
    }
  };

  return (
    <div className={cn("flex h-full flex-col border border-slate-200 bg-white", className)}>
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{headerTitle}</div>
            <div className="text-xs text-slate-500">{headerSubtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100"
              title={expanded ? "Collapse panel" : "Expand panel"}
              aria-label={expanded ? "Collapse panel" : "Expand panel"}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-3">
        {messages.length === 0 && !isTyping && (
          <div className="py-10 text-center">
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-slate-900">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm text-slate-500">{emptyStateText}</p>
          </div>
        )}

        {messages.map((message) => (
          <TranscriptRow
            key={message.id}
            message={message}
            onSuggestion={onSuggestion ?? (onSend ? sendMessage : undefined)}
            onAction={onAction}
          />
        ))}

        {isTyping && <TypingIndicator />}
      </div>

      {inputEnabled && (
        <div className="border-t border-slate-200 px-3 py-2">
          <div className="flex items-end gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 focus-within:border-slate-400">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
              placeholder={placeholder}
              rows={1}
              className="max-h-32 flex-1 resize-none bg-transparent text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
              style={{ minHeight: "24px" }}
            />
            <button
              onClick={() => void sendMessage(input)}
              disabled={!input.trim() || !onSend}
              className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors",
                input.trim() && onSend
                  ? "bg-slate-900 text-white hover:bg-slate-700"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">Enter to send · Shift+Enter for new line</p>
        </div>
      )}
    </div>
  );
}
