"use client";

export function DashboardGreeting() {
  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12
      ? "Good morning"
      : hour >= 12 && hour < 17
        ? "Good afternoon"
        : "Good evening";

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-foreground">
        {greeting}, Jessica
      </h1>
      <p className="text-base text-muted-foreground">
        Upload a complaint and discovery request to get started.
      </p>
    </div>
  );
}
