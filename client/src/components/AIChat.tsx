import { useEffect, useState, useRef } from "react";
import { X, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";

type AIChatProps = { open: boolean; onClose: () => void };

type Msg = { id: string; role: "user" | "assistant"; text: string };

export default function AIChat(props: AIChatProps) {
  const { open, onClose } = props;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>(() => [
    { id: "m0", role: "assistant", text: "What can I do for you today?" },
  ]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  function send() {
    const t = input.trim();
    if (!t) return;
    const m: Msg = { id: String(Date.now()), role: "user", text: t };
    setMessages((s) => [...s, m]);
    setInput("");

    // Call server LLM
    chat.mutate({ messages: [...messages.map((m) => ({ role: m.role as any, content: m.text })), { role: "user", content: t }] });
  }

  const chat = trpc.ai.chat.useMutation({
    onSuccess(result) {
      try {
        const choice = result.choices?.[0];
        if (!choice) return;
        const content = choice.message?.content;
        let text = "";
        if (!content) text = "";
        else if (typeof content === "string") text = content;
        else if (Array.isArray(content)) {
          text = content.map((p: any) => (p.type === "text" ? p.text : JSON.stringify(p))).join("\n");
        }

        if (text) {
          const m: Msg = { id: `r-${Date.now()}`, role: "assistant", text };
          setMessages((s) => [...s, m]);
        }
      } catch (err) {
        console.error("LLM result parse error", err);
      }
    },
    onError(err) {
      const m: Msg = { id: `err-${Date.now()}`, role: "assistant", text: "AI error: " + String(err?.message ?? err) };
      setMessages((s) => [...s, m]);
    },
  });

  return (
    <div aria-hidden={!open} className={`fixed inset-0 z-[120] transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute right-6 top-16 w-[380px] max-w-[95vw] h-[560px] bg-card/95 rounded-2xl shadow-2xl border border-border backdrop-blur-lg transform transition-all duration-300 pointer-events-auto ${
          open ? "translate-x-0 opacity-100 pointer-events-auto" : "translate-x-6 opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">AI Chat</div>
              <div className="text-xs text-muted-foreground">Ask about your grid and energy</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close AI chat" className="p-2 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 h-[calc(100%-120px)] overflow-auto">
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div key={m.id} className={`max-w-[85%] ${m.role === "user" ? "self-end text-right" : "self-start text-left"}`}>
                <div className={`inline-block px-4 py-2 rounded-lg ${m.role === "user" ? "bg-primary text-white" : "bg-muted/70 text-foreground"}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-border flex items-center gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button onClick={send} className="px-3 py-2 rounded-md bg-primary text-white text-sm">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
