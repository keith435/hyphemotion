"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, Profile } from "@/lib/database.types";

type MessageWithSender = ChatMessage & { sender?: Pick<Profile, "id" | "full_name" | "email"> };

export default function ChatPanel({
  channelId,
  currentProfile,
  initialMessages,
  profiles,
}: {
  channelId: string;
  currentProfile: Profile;
  initialMessages: MessageWithSender[];
  profiles: Profile[];
}) {
  const [messages, setMessages] = useState<MessageWithSender[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  async function sendMessage(fileUrl?: string, fileName?: string) {
    if (!text.trim() && !fileUrl) return;
    setSending(true);
    const supabase = createClient();
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("chat_messages").insert({
      channel_id: channelId,
      sender_id: currentProfile.id,
      body,
      file_url: fileUrl ?? null,
      file_name: fileName ?? null,
    });
    setSending(false);
    if (error) alert(`Could not send message: ${error.message}`);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const path = `${channelId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("chat-attachments").upload(path, file);
    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    await sendMessage(data.publicUrl, file.name);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">No messages yet — say hello.</p>
        )}
        {messages.map((m) => {
          const sender = profileMap.get(m.sender_id ?? "");
          const mine = m.sender_id === currentProfile.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-md rounded-2xl px-3 py-2 text-sm ${mine ? "bg-indigo-600 text-white" : "bg-neutral-800 text-neutral-100"}`}>
                {!mine && (
                  <p className="mb-0.5 text-xs font-medium text-neutral-400">
                    {sender?.full_name || sender?.email || "Someone"}
                  </p>
                )}
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                {m.file_url && (
                  <a
                    href={m.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-xs underline opacity-90"
                  >
                    📎 {m.file_name || "attachment"}
                  </a>
                )}
                <p className="mt-1 text-[10px] opacity-60">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex items-center gap-2 border-t border-neutral-800 p-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
          title="Attach file"
        >
          {uploading ? "..." : "📎"}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
