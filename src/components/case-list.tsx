import Link from "next/link";
import { getCases } from "@/actions/cases";

function formatRelativeDate(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function CaseList() {
  const cases = await getCases();

  if (cases.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground">Recent Cases</h2>
      <div className="mt-4">
        {cases.map((c) => (
          <Link
            key={c.id}
            href={`/case/${c.id}`}
            className="flex items-center justify-between border-b border-[#E5E0D8] py-3 transition-colors hover:bg-secondary"
          >
            <span
              className={
                c.name
                  ? "text-base text-foreground"
                  : "text-base italic text-muted-foreground"
              }
            >
              {c.name || "Untitled Case"}
            </span>
            <span className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                {c.docCount} {c.docCount === 1 ? "doc" : "docs"}
              </span>
              <span>{formatRelativeDate(c.createdAt)}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
