import * as React from "react";
import { ArrowRight, Eye, EyeOff, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5 shrink-0">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.6-5.5 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 4 1.5l2.7-2.6C16.9 1.9 14.7 1 12 1 6.5 1 2 5.5 2 11s4.5 10 10 10c5.7 0 9.5-4 9.5-9.7 0-.7-.1-1.2-.2-1.7H12Z" />
      <path fill="#FBBC05" d="M3.8 7.3 6.9 9.6C7.8 7.7 9.8 6.4 12 6.4c1.9 0 3.2.8 4 1.5l2.7-2.6C16.9 1.9 14.7 1 12 1 8 1 4.6 3.3 3.8 7.3Z" />
      <path fill="#34A853" d="M12 21c2.7 0 4.9-.9 6.5-2.4l-3-2.4c-.9.6-2 1-3.5 1-3 0-5.6-2-6.5-4.8l-3.2 2.5C4.2 18.2 7.7 21 12 21Z" />
      <path fill="#4285F4" d="M21.5 11.3H12v3.9h5.5c-.3 1.7-1.4 2.8-2.9 3.4l3 2.4C19.6 19.3 21.5 16 21.5 11.3Z" />
    </svg>
  );
}

type SignIn1Props = {
  className?: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onGoogleClick?: () => void;
  username: string;
  password: string;
  loading?: boolean;
  error?: string | null;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  onFooterClick?: () => void;
};

export function SignIn1({
  className,
  onSubmit,
  onGoogleClick,
  username,
  password,
  loading = false,
  error = null,
  setUsername,
  setPassword,
  onFooterClick,
}: SignIn1Props) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <Card
      className={cn(
        "w-full max-w-[440px] border border-border bg-card text-card-foreground shadow-2xl shadow-black/20",
        className
      )}
    >
      <CardHeader className="space-y-4 px-6 pt-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted text-foreground shadow-sm">
          <UserRound className="h-7 w-7" />
        </div>
        <div className="space-y-3">
          <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">
            Sign in
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Enter your credentials to access your account.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-2">
        <Button
          type="button"
          size="lg"
          onClick={onGoogleClick}
          className="group relative flex h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-[#0b0d12] px-4 text-sm font-semibold text-slate-100 shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-[#11141b] hover:text-white hover:shadow-[0_16px_34px_rgba(0,0,0,0.24)] active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/10"
        >
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.08)_50%,transparent_80%)] opacity-0 transition-transform duration-500 group-hover:translate-x-full group-hover:opacity-100" />
          <span className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/20 shadow-sm">
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt=""
              className="h-4.5 w-4.5"
            />
          </span>
          <span className="relative">Continue with Google</span>
        </Button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold tracking-[0.25em] text-muted-foreground">
            OR
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter Username"
              autoComplete="username"
              className="h-11 rounded-xl border-border bg-background shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter Password"
                autoComplete="current-password"
                className="h-11 rounded-xl border-border bg-background pr-11 shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90"
          >
            {loading ? "Signing In..." : "Sign In"}
            {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="px-6 pb-8 pt-4 text-center">
        <button
          type="button"
          onClick={onFooterClick}
          className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Don't have an account? <span className="font-medium text-foreground">Sign Up</span>
        </button>
      </CardFooter>
    </Card>
  );
}
