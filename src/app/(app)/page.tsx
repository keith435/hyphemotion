import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { Project, SalesDeal } from "@/lib/database.types";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  const isSalesOrAdmin = profile?.role === "admin" || profile?.role === "sales";

  let deals: SalesDeal[] = [];
  if (isSalesOrAdmin) {
    const { data } = await supabase
      .from("sales_deals")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(6);
    deals = (data as SalesDeal[]) ?? [];
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-white">
        Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-sm text-neutral-400">Here&rsquo;s what&rsquo;s happening in the studio.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent projects</h2>
            <Link href="/projects" className="text-xs text-indigo-400 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {((projects as Project[]) ?? []).length === 0 && (
              <p className="text-sm text-neutral-500">No projects yet.</p>
            )}
            {((projects as Project[]) ?? []).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-800 px-3 py-2 text-sm hover:border-neutral-700 hover:bg-neutral-800/50"
              >
                <span className="text-white">{p.name}</span>
                <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs capitalize text-neutral-400">
                  {p.status}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/projects/new"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            + New project
          </Link>
        </section>

        {isSalesOrAdmin && (
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent deals</h2>
              <Link href="/sales" className="text-xs text-indigo-400 hover:underline">
                View pipeline
              </Link>
            </div>
            <div className="space-y-2">
              {deals.length === 0 && <p className="text-sm text-neutral-500">No deals yet.</p>}
              {deals.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 px-3 py-2 text-sm"
                >
                  <span className="text-white">{d.title}</span>
                  <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs capitalize text-neutral-400">
                    {d.stage}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
