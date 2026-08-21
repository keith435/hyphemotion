// Hand-written types matching supabase/migrations/0001_init.sql.
// If you change the schema, update this file to match (or generate it with
// `supabase gen types typescript` once you have the Supabase CLI linked).

export type UserRole = "admin" | "sales" | "production";
export type DealStage = "lead" | "contacted" | "quoted" | "negotiating" | "won" | "lost";
export type ProjectStatus =
  | "brief"
  | "storyboard"
  | "animation"
  | "revisions"
  | "delivered"
  | "archived";
export type ChannelType = "project" | "sales_team";
export type VersionStatus = "pending_review" | "changes_requested" | "approved";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface SalesDeal {
  id: string;
  title: string;
  client_name: string;
  client_email: string | null;
  client_company: string | null;
  value: number;
  stage: DealStage;
  owner_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  // Populated for deals sourced by the daily lead-research automation
  // (see supabase/migrations/0007_lead_research_fields.sql). Null for
  // deals created by hand via "+ New deal".
  sourced_lead_id: string | null;
  industry: string | null;
  role: string | null;
  fit_score: number | null;
  problem_identified: string | null;
  video_opportunity: string | null;
  outreach_angle: string | null;
  email_subject: string | null;
  email_body: string | null;
}

export interface Project {
  id: string;
  deal_id: string | null;
  name: string;
  client_name: string;
  project_type: string;
  status: ProjectStatus;
  deadline: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  project_id: string;
  profile_id: string;
}

export interface ChatChannel {
  id: string;
  type: ChannelType;
  project_id: string | null;
  name: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string | null;
  body: string;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  title: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  status: VersionStatus;
  uploaded_by: string | null;
  created_at: string;
}

export interface RevisionComment {
  id: string;
  version_id: string;
  author_id: string | null;
  body: string;
  timestamp_seconds: number | null;
  x_pct: number | null;
  y_pct: number | null;
  created_at: string;
}

// Minimal Database shape so @supabase/ssr's generics are happy.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
