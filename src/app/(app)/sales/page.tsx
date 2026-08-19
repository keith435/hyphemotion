import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { SalesDeal } from "@/lib/database.types";
import SalesKanban from "@/components/SalesKanban";
import NewDealForm from "@/components/NewDealForm";

export default async function SalesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: deals } = await supabase
    .from("sales_deals")
    .select("*")
    .order("updated_at", { ascending: false });

  if (profile?.role === "production") {
    return (
      <div className="p-8">
        <p className="text-sm text-neutral-400">
          The sales pipeline is only visible to sales and admin roles.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sales Pipeline</h1>
          <p className="mt-1 text-sm text-neutral-400">Drag deals through stages as they progress.</p>
        </div>
        <NewDealForm />
      </div>
      <SalesKanban deals={(deals as SalesDeal[]) ?? []} />
    </div>
  );
}
