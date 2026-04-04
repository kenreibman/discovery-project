import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { getCases } from "@/actions/cases";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const cases = await getCases();

  return (
    <div className="flex min-h-screen">
      <SidebarNav cases={cases} />
      <main className="flex-1">
        <div className="mx-auto max-w-[640px] px-6">{children}</div>
      </main>
    </div>
  );
}
