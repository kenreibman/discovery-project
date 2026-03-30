"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { loginAction } from "@/app/(auth)/login/actions";

export function LoginForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: null,
  });

  return (
    <Card className="w-full max-w-[400px] border bg-card rounded-lg">
      <CardContent className="p-8">
        <form action={formAction}>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          <p className="text-center text-base font-semibold text-muted-foreground">
            Discovery Drafter
          </p>

          <div className="h-6" />

          <div>
            <Label htmlFor="email" className="text-sm font-normal">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1"
            />
          </div>

          <div className="h-4" />

          <div>
            <Label htmlFor="password" className="text-sm font-normal">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1"
              aria-describedby={state.error ? "login-error" : undefined}
            />
          </div>

          <div className="h-2" />

          {state.error && (
            <p
              className="text-sm text-destructive"
              aria-live="polite"
              id="login-error"
            >
              {state.error}
            </p>
          )}

          <div className="h-6" />

          <Button
            type="submit"
            className="w-full min-h-[44px] text-base font-semibold"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
