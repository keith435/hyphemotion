// Sends a Web Push notification whenever a DB trigger fires it for a new
// chat message, revision upload, revision comment, or project membership.
// Triggered by the `trigger_push_notify()` Postgres function via pg_net.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://hyphemotion.netlify.app";

webpush.setVapidDetails("mailto:keith@hyphemotion.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type Notify = { title: string; body: string; url: string; recipientIds: string[]; excludeId?: string | null };

async function buildNotification(table: string, record: Record<string, unknown>): Promise<Notify | null> {
  if (table === "chat_messages") {
    const channelId = record.channel_id as string;
    const senderId = record.sender_id as string | null;
    const { data: channel } = await supabase
      .from("chat_channels")
      .select("type, project_id, name")
      .eq("id", channelId)
      .single();
    if (!channel) return null;

    let recipientIds: string[] = [];
    let url = "/sales-chat";
    if (channel.type === "project" && channel.project_id) {
      const { data: members } = await supabase
        .from("project_members")
        .select("profile_id")
        .eq("project_id", channel.project_id);
      recipientIds = (members ?? []).map((m) => m.profile_id as string);
      url = `/projects/${channel.project_id}`;
    } else {
      const { data: people } = await supabase.from("profiles").select("id").in("role", ["admin", "sales"]);
      recipientIds = (people ?? []).map((p) => p.id as string);
    }
    const body = (record.body as string) || (record.file_name ? `Sent a file: ${record.file_name}` : "New message");
    return { title: channel.type === "sales_team" ? "Sales Team Chat" : "New project message", body, url, recipientIds, excludeId: senderId };
  }

  if (table === "project_versions") {
    const projectId = record.project_id as string;
    const uploadedBy = record.uploaded_by as string | null;
    const { data: members } = await supabase.from("project_members").select("profile_id").eq("project_id", projectId);
    const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).single();
    return {
      title: "New revision uploaded",
      body: `${project?.name ?? "A project"}: ${record.title || "new version"} was uploaded for review`,
      url: `/projects/${projectId}`,
      recipientIds: (members ?? []).map((m) => m.profile_id as string),
      excludeId: uploadedBy,
    };
  }

  if (table === "revision_comments") {
    const versionId = record.version_id as string;
    const authorId = record.author_id as string | null;
    const { data: version } = await supabase.from("project_versions").select("project_id, title").eq("id", versionId).single();
    if (!version) return null;
    const { data: members } = await supabase.from("project_members").select("profile_id").eq("project_id", version.project_id);
    return {
      title: "New revision comment",
      body: (record.body as string)?.slice(0, 140) || "New comment on a revision",
      url: `/projects/${version.project_id}`,
      recipientIds: (members ?? []).map((m) => m.profile_id as string),
      excludeId: authorId,
    };
  }

  if (table === "project_members") {
    const projectId = record.project_id as string;
    const profileId = record.profile_id as string;
    const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).single();
    return {
      title: "Added to a project",
      body: `You were added to ${project?.name ?? "a project"}`,
      url: `/projects/${projectId}`,
      recipientIds: [profileId],
      excludeId: null,
    };
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const table = payload.table as string;
    const record = payload.record as Record<string, unknown>;

    const notification = await buildNotification(table, record);
    if (!notification) return new Response("ok", { status: 200 });

    const targetIds = notification.recipientIds.filter((id) => id && id !== notification.excludeId);
    if (targetIds.length === 0) return new Response("ok", { status: 200 });

    const { data: subs } = await supabase.from("push_subscriptions").select("*").in("profile_id", targetIds);

    await Promise.all(
      (subs ?? []).map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: notification.title, body: notification.body, url: `${APP_URL}${notification.url}` })
          );
        } catch (err) {
          // Subscription is dead (unsubscribed/expired) — clean it up.
          if (err instanceof Error && /410|404/.test(err.message)) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          } else {
            console.error("push send failed", err);
          }
        }
      })
    );

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("error", { status: 500 });
  }
});
