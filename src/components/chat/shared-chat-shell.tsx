"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, X } from "lucide-react";
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
}

function renderRichText(content: string) {
  return content
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

function ActionCards({ actions, onAction }: { actions: ThreadAction[]; onAction?: (action: ThreadAction) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction?.(action)}
          className="text-xs px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-full hover:bg-slate-100 transition-colors font-medium"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  onSuggestion,
  onAction,
}: {
  message: ChatThreadTurn;
  onSuggestion?: (text: string) => void;
  onAction?: (action: ThreadAction) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-end gap-2", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className="flex flex-col gap-2 max-w-[85%]">
        <div
          className={cn(
            "px-4 py-3 text-sm leading-relaxed shadow-sm",
            isUser
              ? "bg-sky-600 text-white rounded-2xl rounded-br-sm"
              : "bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-sm"
          )}
          dangerouslySetInnerHTML={{ __html: renderRichText(message.content) }}
        />

        {message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSuggestion?.(suggestion)}
                className="text-xs px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-full hover:bg-sky-100 transition-colors font-medium"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {message.actions && message.actions.length > 0 && <ActionCards actions={message.actions} onAction={onAction} />}
      </div>
    </div>
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
    await onSend(text);
    setInput("");
  };

  return (
    <div className={cn("flex flex-col bg-slate-50 border border-slate-200 rounded-xl", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{headerTitle}</div>
            <div className="text-xs text-sky-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
              {headerSubtitle}
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[220px]">
        {messages.length === 0 && !isTyping && (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-5 h-5 text-sky-500" />
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">{emptyStateText}</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSuggestion={onSuggestion ?? (onSend ? sendMessage : undefined)}
            onAction={onAction}
          />
        ))}

        {isTyping && <TypingIndicator />}
      </div>

      {inputEnabled && (
        <div className="px-3 py-3 bg-white border-t border-slate-200 rounded-b-xl">
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
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
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none resize-none leading-relaxed max-h-32"
              style={{ minHeight: "24px" }}
            />
            <button
              onClick={() => void sendMessage(input)}
              disabled={!input.trim() || !onSend}
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                input.trim() && onSend
                  ? "bg-sky-600 text-white hover:bg-sky-700 shadow-sm"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      )}
    </div>
  );
}
