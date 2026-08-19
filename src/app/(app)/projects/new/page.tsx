import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/lib/actions";
import type { Profile } from "@/lib/database.types";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold text-white">New project</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Creates the project, its chat channel, and its revisions tab together — nothing is left
        half-set-up.
      </p>

      <form action={createProject} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Project name</label>
          <input
            name="name"
            required
            placeholder="Acme — 60s brand explainer"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Client name</label>
          <input
            name="client_name"
            required
            placeholder="Acme Inc."
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Project type</label>
          <input
            name="project_type"
            placeholder="2D explainer, 3D product render, logo animation..."
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Deadline</label>
          <input
            name="deadline"
            type="date"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Assign team members
          </label>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-800 p-2">
            {((profiles as Profile[]) ?? []).map((p) => (
              <label key={p.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-700">
                <input type="checkbox" name="member_ids" value={p.id} className="accent-indigo-600" />
                <span className="text-white">{p.full_name || p.email}</span>
                <span className="text-xs capitalize text-neutral-500">({p.role})</span>
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Create project
        </button>
      </form>
    </div>
  );
}
