"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ProjectVersion, RevisionComment, VersionStatus } from "@/lib/database.types";

const STATUS_LABEL: Record<VersionStatus, string> = {
  pending_review: "Pending review",
  changes_requested: "Changes requested",
  approved: "Approved",
};

const STATUS_COLOR: Record<VersionStatus, string> = {
  pending_review: "bg-amber-900/40 text-amber-300",
  changes_requested: "bg-red-900/40 text-red-300",
  approved: "bg-emerald-900/40 text-emerald-300",
};

export default function RevisionsTab({
  projectId,
  currentProfile,
  initialVersions,
  profiles,
}: {
  projectId: string;
  currentProfile: Profile;
  initialVersions: ProjectVersion[];
  profiles: Profile[];
}) {
  const [versions, setVersions] = useState<ProjectVersion[]>(
    [...initialVersions].sort((a, b) => b.version_number - a.version_number)
  );
  const [selectedId, setSelectedId] = useState<string | null>(versions[0]?.id ?? null);
  const [comments, setComments] = useState<RevisionComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLVideoElement>(null);
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const selected = versions.find((v) => v.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    const supabase = createClient();
    supabase
      .from("revision_comments")
      .select("*")
      .eq("version_id", selectedId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setComments((data as RevisionComment[]) ?? []));
  }, [selectedId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`revisions:${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "project_versions", filter: `project_id=eq.${projectId}` },
        (payload) => {
          const v = payload.new as ProjectVersion;
          setVersions((prev) => (prev.some((x) => x.id === v.id) ? prev : [v, ...prev]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "project_versions", filter: `project_id=eq.${projectId}` },
        (payload) => {
          const v = payload.new as ProjectVersion;
          setVersions((prev) => prev.map((x) => (x.id === v.id ? v : x)));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "revision_comments" },
        (payload) => {
          const c = payload.new as RevisionComment;
          if (c.version_id === selectedId) {
            setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, selectedId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const path = `${projectId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("revisions").upload(path, file);
    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("revisions").getPublicUrl(path);
    const nextVersion = (versions[0]?.version_number ?? 0) + 1;
    const fileType = file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : "other";

    const { data: inserted, error } = await supabase
      .from("project_versions")
      .insert({
        project_id: projectId,
        version_number: nextVersion,
        title: `v${nextVersion}`,
        file_url: data.publicUrl,
        file_name: file.name,
        file_type: fileType,
        uploaded_by: currentProfile.id,
      })
      .select("*")
      .single();

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (error) {
      alert(`Could not save version: ${error.message}`);
      return;
    }
    if (inserted) {
      setVersions((prev) => [inserted as ProjectVersion, ...prev]);
      setSelectedId((inserted as ProjectVersion).id);
    }
  }

  async function updateStatus(status: VersionStatus) {
    if (!selected) return;
    const supabase = createClient();
    setVersions((prev) => prev.map((v) => (v.id === selected.id ? { ...v, status } : v)));
    const { error } = await supabase.from("project_versions").update({ status }).eq("id", selected.id);
    if (error) alert(`Could not update status: ${error.message}`);
  }

  async function addComment() {
    if (!selected || !commentText.trim()) return;
    const supabase = createClient();
    const timestamp_seconds =
      selected.file_type === "video" && mediaRef.current ? mediaRef.current.currentTime : null;
    const body = commentText.trim();
    setCommentText("");
    const { data: inserted, error } = await supabase
      .from("revision_comments")
      .insert({ version_id: selected.id, author_id: currentProfile.id, body, timestamp_seconds })
      .select("*")
      .single();
    if (error) {
      alert(`Could not post comment: ${error.message}`);
      return;
    }
    if (inserted) setComments((prev) => [...prev, inserted as RevisionComment]);
  }

  function seekTo(seconds: number | null) {
    if (seconds != null && mediaRef.current) {
      mediaRef.current.currentTime = seconds;
      mediaRef.current.play().catch(() => {});
    }
  }

  return (
    <div className="flex h-full">
      {/* Version list */}
      <div className="w-56 shrink-0 overflow-y-auto border-r border-neutral-800 p-3">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept="video/*,image/*" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mb-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "+ Upload version"}
        </button>
        <div className="space-y-1">
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                v.id === selectedId ? "bg-neutral-800 text-white" : "text-neutral-400 hover:bg-neutral-800/60"
              }`}
            >
              <span className="block font-medium">v{v.version_number}</span>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${STATUS_COLOR[v.status]}`}>
                {STATUS_LABEL[v.status]}
              </span>
            </button>
          ))}
          {versions.length === 0 && <p className="px-1 text-xs text-neutral-600">No versions uploaded yet.</p>}
        </div>
      </div>

      {/* Viewer + comments */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
            Upload the first cut to start collecting feedback.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <p className="text-sm font-medium text-white">
                {selected.title || `v${selected.version_number}`}{" "}
                <span className="text-neutral-500">— {selected.file_name}</span>
              </p>
              <select
                value={selected.status}
                onChange={(e) => updateStatus(e.target.value as VersionStatus)}
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-white"
              >
                {(Object.keys(STATUS_LABEL) as VersionStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <div className="flex flex-1 items-center justify-center bg-black p-4">
                {selected.file_type === "video" ? (
                  <video ref={mediaRef} src={selected.file_url} controls className="max-h-full max-w-full" />
                ) : (
                  <img src={selected.file_url} alt={selected.title} className="max-h-full max-w-full object-contain" />
                )}
              </div>
              <div className="flex w-80 shrink-0 flex-col border-l border-neutral-800">
                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {comments.length === 0 && (
                    <p className="text-xs text-neutral-600">No comments on this version yet.</p>
                  )}
                  {comments.map((c) => {
                    const author = profileMap.get(c.author_id ?? "");
                    return (
                      <div key={c.id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-sm">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-neutral-300">
                            {author?.full_name || author?.email || "Someone"}
                          </span>
                          {c.timestamp_seconds != null && (
                            <button
                              onClick={() => seekTo(c.timestamp_seconds)}
                              className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-indigo-400 hover:underline"
                            >
                              @{formatTime(c.timestamp_seconds)}
                            </button>
                          )}
                        </div>
                        <p className="text-neutral-200">{c.body}</p>
                      </div>
                    );
                  })}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addComment();
                  }}
                  className="border-t border-neutral-800 p-3"
                >
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={
                      selected.file_type === "video"
                        ? "Comment (pins current playback time)..."
                        : "Comment..."
                    }
                    rows={2}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Post comment
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}
