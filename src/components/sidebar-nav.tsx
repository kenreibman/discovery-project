"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

type SidebarCase = {
  id: string;
  name: string | null;
  createdAt: Date | null;
  docCount: number;
};

type SidebarNavProps = {
  cases: SidebarCase[];
};

async function handleLogout() {
  const { signOut } = await import("next-auth/react");
  await signOut({ redirectTo: "/login" });
}

export function SidebarNav({ cases }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[280px] flex-shrink-0 flex-col border-r border-border bg-[var(--sidebar)]">
      {/* App name */}
      <div className="px-6 py-6">
        <span className="text-base font-semibold text-foreground">
          Discovery Drafter
        </span>
      </div>

      <Separator />

      {/* Case list area */}
      <div className="flex-1 overflow-y-auto">
        {cases.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No cases yet</p>
          </div>
        ) : (
          <nav className="py-2">
            {cases.map((c) => {
              const isActive = pathname === `/case/${c.id}`;
              return (
                <Link
                  key={c.id}
                  href={`/case/${c.id}`}
                  className={`block px-3 py-2 transition-colors hover:bg-[#F0EDE6] ${
                    isActive
                      ? "border-l-[3px] border-[#C8653A] bg-[#EDE8DF] pl-[9px]"
                      : ""
                  }`}
                >
                  <span
                    className={`block truncate text-base ${
                      c.name
                        ? "text-foreground"
                        : "italic text-muted-foreground"
                    }`}
                  >
                    {c.name || "Untitled Case"}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {c.docCount === 1
                      ? "1 document"
                      : `${c.docCount} documents`}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Bottom section */}
      <div className="mt-auto">
        <Separator />
        <Button
          variant="ghost"
          className="flex w-full items-center justify-start gap-2 rounded-none px-6 py-4 h-auto"
          onClick={handleLogout}
        >
          <LogOut size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Log out</span>
        </Button>
      </div>
    </aside>
  );
}
