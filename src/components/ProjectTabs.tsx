"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChatMessage, Profile, Project, ProjectVersion, ProjectStatus } from "@/lib/database.types";
import ChatPanel from "@/components/ChatPanel";
import RevisionsTab from "@/components/RevisionsTab";
import { updateProjectStatus, deleteProject } from "@/lib/actions";

const STATUSES: ProjectStatus[] = ["brief", "storyboard", "animation", "revisions", "delivered", "archived"];

export default function ProjectTabs({
  project,
  channelId,
  currentProfile,
  initialMessages,
  initialVersions,
  profiles,
}: {
  project: Project;
  channelId: string | null;
  currentProfile: Profile;
  initialMessages: ChatMessage[];
  initialVersions: ProjectVersion[];
  profiles: Profile[];
}) {
  const [tab, setTab] = useState<"chat" | "revisions">("revisions");
  const [status, setStatus] = useState(project.status);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDeleteTransition] = useTransition();
  const router = useRouter();

  async function handleStatusChange(next: ProjectStatus) {
    setStatus(next);
    try {
      await updateProjectStatus(project.id, next);
    } catch {
      setStatus(project.status);
    }
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        await deleteProject(project.id);
        router.push("/projects");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not delete project");
        setConfirmingDelete(false);
      }
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-800 px-8 py-4">
        <div>
          <h1 className="text-lg font-semibold text-white">{project.name}</h1>
          <p className="text-xs text-neutral-500">{project.client_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm capitalize text-white"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {currentProfile.role === "admin" &&
            (confirmingDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-400">Delete project?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-lg border border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                title="Delete project"
                className="rounded-lg border border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-400 hover:border-red-800 hover:text-red-300"
              >
                Delete
              </button>
            ))}
        </div>
      </div>

      <div className="flex gap-1 border-b border-neutral-800 px-8">
        {(["revisions", "chat"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize ${
              tab === t
                ? "border-b-2 border-indigo-500 text-white"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t === "revisions" ? "Revisions" : "Project Chat"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "revisions" ? (
          <RevisionsTab
            projectId={project.id}
            currentProfile={currentProfile}
            initialVersions={initialVersions}
            profiles={profiles}
          />
        ) : channelId ? (
          <ChatPanel
            channelId={channelId}
            currentProfile={currentProfile}
            initialMessages={initialMessages}
            profiles={profiles}
          />
        ) : (
          <p className="p-8 text-sm text-neutral-500">Chat channel not found for this project.</p>
        )}
      </div>
    </div>
  );
}
