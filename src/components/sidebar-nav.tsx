"use client";

import { LogOut } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

async function handleLogout() {
  // Use next-auth signOut on the client side
  const { signOut } = await import("next-auth/react");
  await signOut({ redirectTo: "/login" });
}

export function SidebarNav() {
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
      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        <p className="text-sm text-muted-foreground">No cases yet</p>
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
