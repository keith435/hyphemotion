import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/database.types";

const STATUS_COLORS: Record<string, string> = {
  brief: "bg-neutral-800 text-neutral-300",
  storyboard: "bg-blue-900/40 text-blue-300",
  animation: "bg-purple-900/40 text-purple-300",
  revisions: "bg-amber-900/40 text-amber-300",
  delivered: "bg-emerald-900/40 text-emerald-300",
  archived: "bg-neutral-800 text-neutral-500",
};

export default async function ProjectsPage() {
  const supabase = await createClient();
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {((projects as Project[]) ?? []).map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 hover:border-neutral-700"
          >
            <div className="mb-2 flex items-start justify-between">
              <h2 className="font-medium text-white">{p.name}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_COLORS[p.status]}`}>
                {p.status}
              </span>
            </div>
            <p className="text-sm text-neutral-500">{p.client_name}</p>
            {p.deadline && (
              <p className="mt-2 text-xs text-neutral-600">
                Due {new Date(p.deadline).toLocaleDateString()}
              </p>
            )}
          </Link>
        ))}
        {((projects as Project[]) ?? []).length === 0 && (
          <p className="text-sm text-neutral-500">No projects yet. Create your first one.</p>
        )}
      </div>
    </div>
  );
}
