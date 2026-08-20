"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/database.types";
import NotificationSetup from "@/components/NotificationSetup";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/sales", label: "Sales Pipeline", roles: ["admin", "sales"] as const },
  { href: "/sales-chat", label: "Sales Team Chat", roles: ["admin", "sales"] as const },
];

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-6 px-2">
        <h1 className="text-base font-semibold text-white">Hyphemotion</h1>
        <p className="text-xs text-neutral-500">Internal workspace</p>
      </div>
      <nav className="flex-1 space-y-1">
        {links
          .filter((l) => !l.roles || l.roles.includes(profile.role as "admin" | "sales"))
          .map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
      </nav>
      <div className="mt-4 border-t border-neutral-800 pt-4">
        <div className="mb-2 px-2">
          <p className="truncate text-sm text-white">{profile.full_name || profile.email}</p>
          <p className="text-xs capitalize text-neutral-500">{profile.role}</p>
        </div>
        <NotificationSetup profileId={profile.id} />
        <button
          onClick={signOut}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
