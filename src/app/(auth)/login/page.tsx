import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session) {
    redirect("/");
  }

  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";

  return <LoginForm callbackUrl={callbackUrl} />;
}
