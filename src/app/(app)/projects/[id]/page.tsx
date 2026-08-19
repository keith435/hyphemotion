import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import ProjectTabs from "@/components/ProjectTabs";
import type { ChatMessage, Profile, Project, ProjectVersion } from "@/lib/database.types";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const currentProfile = await getCurrentProfile();
  if (!currentProfile) notFound();

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) notFound(); // also covers "not a member" since RLS hides the row

  const { data: channel } = await supabase
    .from("chat_channels")
    .select("*")
    .eq("project_id", id)
    .eq("type", "project")
    .single();

  const { data: messages } = channel
    ? await supabase
        .from("chat_messages")
        .select("*")
        .eq("channel_id", channel.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: versions } = await supabase
    .from("project_versions")
    .select("*")
    .eq("project_id", id)
    .order("version_number", { ascending: false });

  const { data: profiles } = await supabase.from("profiles").select("*");

  return (
    <ProjectTabs
      project={project as Project}
      channelId={channel?.id ?? null}
      currentProfile={currentProfile}
      initialMessages={(messages as ChatMessage[]) ?? []}
      initialVersions={(versions as ProjectVersion[]) ?? []}
      profiles={(profiles as Profile[]) ?? []}
    />
  );
}
