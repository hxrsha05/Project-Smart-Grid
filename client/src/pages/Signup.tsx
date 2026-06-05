import ThemeToggle from "@/components/ThemeToggle";
import { SignIn1 } from "@/components/ui/sign-in-1";
import { getLoginUrl } from "@/const";
import { Zap } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { setGuestSession } from "@/_core/hooks/useAuth";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      setLoading(true);
      setGuestSession(username);
      window.location.href = "/dashboard/overview";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="pattern-bg absolute inset-0 opacity-25 dark:opacity-45" />
        <svg
          className="cube-svg absolute left-[-30%] top-[-20%] h-[200%] w-[200%] opacity-35 mix-blend-multiply dark:mix-blend-screen dark:opacity-90"
          viewBox="0 0 1200 800"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="signupCubeGlow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(91, 140, 255, 0.28)" />
              <stop offset="100%" stopColor="rgba(91, 140, 255, 0)" />
            </linearGradient>
          </defs>
          <g opacity="0.65">
            <path d="M120 180h120l60 60v120l-60 60H120l-60-60V240l60-60Z" fill="url(#signupCubeGlow)" stroke="rgba(91, 140, 255, 0.55)" strokeWidth="2" />
            <path d="M450 90h150l75 75v150l-75 75H450l-75-75V165l75-75Z" fill="url(#signupCubeGlow)" stroke="rgba(91, 140, 255, 0.5)" strokeWidth="2" />
            <path d="M820 210h110l55 55v110l-55 55H820l-55-55V265l55-55Z" fill="url(#signupCubeGlow)" stroke="rgba(91, 140, 255, 0.48)" strokeWidth="2" />
            <path d="M250 520h140l70 70v140l-70 70H250l-70-70V590l70-70Z" fill="url(#signupCubeGlow)" stroke="rgba(91, 140, 255, 0.46)" strokeWidth="2" />
          </g>
        </svg>
        <div className="absolute inset-0 bg-background/30 dark:bg-background/10" />
      </div>

      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="container flex h-16 items-center justify-between">
            <button
              type="button"
              onClick={() => setLocation("/")}
              className="flex items-center gap-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Zap className="h-5 w-5" />
              </div>
              <span className="font-display hidden text-lg font-bold sm:inline">
                SmartGrid
              </span>
            </button>

            <ThemeToggle />
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8 sm:py-16">
          <div className="w-full max-w-md">
            <div className="mb-10 space-y-2 text-center">
              <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Welcome Back
              </h1>
              <p className="text-base text-muted-foreground">
                Sign in to access your account
              </p>
            </div>

            <SignIn1
              onSubmit={handleCreateAccount}
              onGoogleClick={() => {
                window.location.href = getLoginUrl();
              }}
              username={username}
              password={password}
              loading={loading}
              error={error}
              setUsername={setUsername}
              setPassword={setPassword}
              onFooterClick={() => setLocation("/")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
