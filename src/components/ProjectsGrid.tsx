"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/database.types";
import { deleteProject } from "@/lib/actions";

const STATUS_COLORS: Record<string, string> = {
  brief: "bg-neutral-800 text-neutral-300",
  storyboard: "bg-blue-900/40 text-blue-300",
  animation: "bg-purple-900/40 text-purple-300",
  revisions: "bg-amber-900/40 text-amber-300",
  delivered: "bg-emerald-900/40 text-emerald-300",
  archived: "bg-neutral-800 text-neutral-500",
};

export default function ProjectsGrid({ projects, isAdmin }: { projects: Project[]; isAdmin: boolean }) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteProject(id);
        setConfirmId(null);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not delete project");
      }
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <div key={p.id} className="group relative rounded-2xl border border-neutral-800 bg-neutral-900 p-5 hover:border-neutral-700">
          {isAdmin && (
            <button
              onClick={(e) => {
                e.preventDefault();
                setConfirmId(confirmId === p.id ? null : p.id);
              }}
              title="Delete project"
              className="absolute right-3 top-3 z-10 rounded-md p-1 text-neutral-600 opacity-0 hover:bg-red-900/40 hover:text-red-300 group-hover:opacity-100"
            >
              ✕
            </button>
          )}

          {confirmId === p.id ? (
            <div className="flex h-full flex-col justify-between">
              <div>
                <h2 className="mb-1 font-medium text-white">{p.name}</h2>
                <p className="text-sm text-neutral-400">
                  Delete this project? This removes its chat, revisions and comments permanently.
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={pending}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {pending ? "Deleting…" : "Delete"}
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <Link href={`/projects/${p.id}`} className="block">
              <div className="mb-2 flex items-start justify-between pr-6">
                <h2 className="font-medium text-white">{p.name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_COLORS[p.status]}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-sm text-neutral-500">{p.client_name}</p>
              {p.deadline && (
                <p className="mt-2 text-xs text-neutral-600">Due {new Date(p.deadline).toLocaleDateString()}</p>
              )}
            </Link>
          )}
        </div>
      ))}
      {projects.length === 0 && <p className="text-sm text-neutral-500">No projects yet. Create your first one.</p>}
    </div>
  );
}
