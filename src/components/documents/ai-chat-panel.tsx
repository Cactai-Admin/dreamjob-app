"use client";

// ── AiChatPanel — AI assistant panel for document refinement ──

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  workflowId: string;
  surface?: string;
  onClose?: () => void;
  className?: string;
  initialMessages?: ChatMessage[];
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

function MessageBubble({ message, onSuggestion }: { message: ChatMessage; onSuggestion?: (text: string) => void }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex items-end gap-2", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className="flex flex-col gap-2 max-w-[85%]">
        <div className={cn(
          "px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-sky-600 text-white rounded-2xl rounded-br-sm"
            : "bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-sm"
        )}
          dangerouslySetInnerHTML={{
            __html: message.content
              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
              .replace(/\n/g, "<br/>"),
          }}
        />
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestion?.(s)}
                className="text-xs px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-full hover:bg-sky-100 transition-colors font-medium"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AiChatPanel({ workflowId, surface = "document", onClose, className, initialMessages }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className={cn("flex flex-col bg-slate-50 border-l border-slate-200", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">AI Assistant</div>
            <div className="text-xs text-sky-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
              Ready to help
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isTyping && !initialMessages?.length && (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-5 h-5 text-sky-500" />
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Ask me to refine any section, adjust tone, or match specific requirements.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onSuggestion={sendMessage} />
        ))}
        {isTyping && <TypingIndicator />}
      </div>

      {/* Input */}
      <div className="px-3 py-3 bg-white border-t border-slate-200">
        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to refine your document…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none resize-none leading-relaxed max-h-32"
            style={{ minHeight: "24px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              input.trim() && !isTyping
                ? "bg-sky-600 text-white hover:bg-sky-700 shadow-sm"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
