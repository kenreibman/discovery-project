"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  prevState: { error: string | null },
  formData: FormData
) {
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: callbackUrl,
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "Something went wrong." };
      }
    }
    throw error; // Re-throw non-auth errors (redirect is thrown as error)
  }
}
