import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import ChatPanel from "@/components/ChatPanel";
import type { ChatMessage, Profile } from "@/lib/database.types";

export default async function SalesChatPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (profile?.role === "production") {
    return (
      <div className="p-8">
        <p className="text-sm text-neutral-400">
          The sales team chat is only visible to sales and admin roles.
        </p>
      </div>
    );
  }

  const { data: channel } = await supabase
    .from("chat_channels")
    .select("*")
    .eq("type", "sales_team")
    .single();

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("channel_id", channel?.id ?? "")
    .order("created_at", { ascending: true });

  const { data: profiles } = await supabase.from("profiles").select("*");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 px-8 py-4">
        <h1 className="text-lg font-semibold text-white">Sales Team Chat</h1>
        <p className="text-xs text-neutral-500">Internal deal discussion, separate from client/project chat.</p>
      </div>
      <div className="flex-1 overflow-hidden">
        {channel && profile ? (
          <ChatPanel
            channelId={channel.id}
            currentProfile={profile}
            initialMessages={(messages as ChatMessage[]) ?? []}
            profiles={(profiles as Profile[]) ?? []}
          />
        ) : (
          <p className="p-8 text-sm text-neutral-500">Sales Team channel not found.</p>
        )}
      </div>
    </div>
  );
}
