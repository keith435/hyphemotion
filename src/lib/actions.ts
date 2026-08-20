"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DealStage, ProjectStatus } from "@/lib/database.types";

// ---------- Sales deals ----------

export async function createDeal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const title = String(formData.get("title") || "").trim();
  const client_name = String(formData.get("client_name") || "").trim();
  const client_email = String(formData.get("client_email") || "").trim() || null;
  const client_company = String(formData.get("client_company") || "").trim() || null;
  const value = Number(formData.get("value") || 0);
  const notes = String(formData.get("notes") || "").trim();

  if (!title || !client_name) throw new Error("Title and client name are required");

  const { error } = await supabase.from("sales_deals").insert({
    title,
    client_name,
    client_email,
    client_company,
    value,
    notes,
    owner_id: user.id,
    stage: "lead" as DealStage,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/sales");
}

export async function updateDealStage(dealId: string, stage: DealStage) {
  const supabase = await createClient();
  const { error } = await supabase.from("sales_deals").update({ stage }).eq("id", dealId);
  if (error) throw new Error(error.message);
  revalidatePath("/sales");
}

/** Won deal -> project, in one atomic-ish step: create project, then link deal. */
export async function convertDealToProject(dealId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: deal, error: dealError } = await supabase
    .from("sales_deals")
    .select("*")
    .eq("id", dealId)
    .single();
  if (dealError || !deal) throw new Error(dealError?.message || "Deal not found");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      deal_id: deal.id,
      name: deal.title,
      client_name: deal.client_name,
      created_by: user.id,
      status: "brief" as ProjectStatus,
    })
    .select("id")
    .single();
  if (projectError || !project) throw new Error(projectError?.message || "Could not create project");

  await supabase.from("sales_deals").update({ stage: "won" as DealStage }).eq("id", dealId);

  revalidatePath("/sales");
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

// ---------- Projects ----------

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const name = String(formData.get("name") || "").trim();
  const client_name = String(formData.get("client_name") || "").trim();
  const project_type = String(formData.get("project_type") || "").trim();
  const deadline = String(formData.get("deadline") || "") || null;
  const memberIds = formData.getAll("member_ids").map(String);

  if (!name || !client_name) throw new Error("Project name and client name are required");

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ name, client_name, project_type, deadline, created_by: user.id })
    .select("id")
    .single();
  if (error || !project) throw new Error(error?.message || "Could not create project");

  // creator is added automatically by the DB trigger; add the rest of the team here
  const others = memberIds.filter((id) => id !== user.id);
  if (others.length > 0) {
    await supabase
      .from("project_members")
      .insert(others.map((profile_id) => ({ project_id: project.id, profile_id })));
  }

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ status }).eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

/** Admin only (enforced by RLS) — deletes the project and everything under it
 * (chat, revisions, comments, membership) via cascading foreign keys. */
export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
  revalidatePath("/");
}
