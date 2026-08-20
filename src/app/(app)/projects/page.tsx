import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import ProjectsGrid from "@/components/ProjectsGrid";
import type { Project } from "@/lib/database.types";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Projects</h1>
          <p className="mt-1 text-sm text-neutral-400">All animation projects in flight.</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + New project
        </Link>
      </div>

      <ProjectsGrid projects={(projects as Project[]) ?? []} isAdmin={profile?.role === "admin"} />
    </div>
  );
}
