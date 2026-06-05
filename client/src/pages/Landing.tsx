import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ArrowRight, Zap, Wind, Battery, Grid3X3 } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const handleDashboardClick = () => {
    // Dev-only bypass: allow quick navigation to dashboard without OAuth during local development
    // Vite exposes `import.meta.env.DEV` true in dev mode.
    if (import.meta.env.DEV) {
      setLocation("/dashboard/overview");
      return;
    }

    if (isAuthenticated) {
      setLocation("/dashboard");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  const handleSignupClick = () => {
    setLocation("/signup");
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
            <linearGradient id="landingCubeGlow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(91, 140, 255, 0.28)" />
              <stop offset="100%" stopColor="rgba(91, 140, 255, 0)" />
            </linearGradient>
          </defs>
          <g opacity="0.65">
            <path d="M120 180h120l60 60v120l-60 60H120l-60-60V240l60-60Z" fill="url(#landingCubeGlow)" stroke="rgba(91, 140, 255, 0.55)" strokeWidth="2" />
            <path d="M450 90h150l75 75v150l-75 75H450l-75-75V165l75-75Z" fill="url(#landingCubeGlow)" stroke="rgba(91, 140, 255, 0.5)" strokeWidth="2" />
            <path d="M820 210h110l55 55v110l-55 55H820l-55-55V265l55-55Z" fill="url(#landingCubeGlow)" stroke="rgba(91, 140, 255, 0.48)" strokeWidth="2" />
            <path d="M250 520h140l70 70v140l-70 70H250l-70-70V590l70-70Z" fill="url(#landingCubeGlow)" stroke="rgba(91, 140, 255, 0.46)" strokeWidth="2" />
          </g>
        </svg>
        <div className="absolute inset-0 bg-background/30 dark:bg-background/10" />
      </div>

      <div className="relative z-10">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-display font-bold text-lg">SmartGrid</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button onClick={handleSignupClick} variant="default" size="sm">
              Sign Up
            </Button>
            <Button onClick={handleDashboardClick} variant="default" size="sm">
              Dashboard
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container py-20 lg:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-display font-bold tracking-tight">
              Intelligent Energy Management for Campus Operations
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Optimize renewable energy utilization, manage battery storage, and coordinate grid operations with precision. Real-time visibility and automated decision-making for sustainable campus power management.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={handleDashboardClick}
              size="lg"
              className="group"
            >
              Enter Dashboard
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="default" size="lg" onClick={handleSignupClick}>
              Sign Up
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border py-20 lg:py-32 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-display font-bold mb-4">
              Enterprise-Grade Energy Control
            </h2>
            <p className="text-lg text-muted-foreground">
              Comprehensive platform designed for campus operators who demand precision, reliability, and actionable insights.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: Solar */}
            <div className="card-premium p-6 space-y-4">
              <div className="w-12 h-12 bg-[hsl(var(--solar))] rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold">Solar Integration</h3>
              <p className="text-muted-foreground">
                Real-time solar generation tracking with weather-aware forecasting and optimal charging strategies.
              </p>
            </div>

            {/* Feature 2: Wind */}
            <div className="card-premium p-6 space-y-4">
              <div className="w-12 h-12 bg-[hsl(var(--wind))] rounded-lg flex items-center justify-center">
                <Wind className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold">Wind Power</h3>
              <p className="text-muted-foreground">
                Continuous wind energy monitoring with intelligent prioritization during optimal conditions.
              </p>
            </div>

            {/* Feature 3: Battery */}
            <div className="card-premium p-6 space-y-4">
              <div className="w-12 h-12 bg-[hsl(var(--battery))] rounded-lg flex items-center justify-center">
                <Battery className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold">Battery Management</h3>
              <p className="text-muted-foreground">
                Advanced charge/discharge optimization with health monitoring and cycle management.
              </p>
            </div>

            {/* Feature 4: Grid */}
            <div className="card-premium p-6 space-y-4">
              <div className="w-12 h-12 bg-[hsl(var(--grid))] rounded-lg flex items-center justify-center">
                <Grid3X3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold">Grid Coordination</h3>
              <p className="text-muted-foreground">
                Seamless grid integration with import/export optimization and availability monitoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="container py-20 lg:py-32">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl lg:text-5xl font-display font-bold">
              Complete Visibility & Control
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to manage campus energy efficiently
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="text-lg font-display font-bold">Real-Time Monitoring</h3>
              <p className="text-muted-foreground">
                Live KPI dashboards showing total consumption, renewable generation, battery state, and grid status with instant updates.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-display font-bold">Decision Engine</h3>
              <p className="text-muted-foreground">
                Automated energy routing with 7 intelligent rules that optimize renewable usage, battery charging, and grid coordination.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-display font-bold">Advanced Analytics</h3>
              <p className="text-muted-foreground">
                Interactive charts including energy flow trends, source breakdown, load profiles, and historical performance analysis.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-display font-bold">Alert Management</h3>
              <p className="text-muted-foreground">
                Intelligent alerting system with three severity levels, acknowledgment workflows, and complete audit history.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-display font-bold">Report Generation</h3>
              <p className="text-muted-foreground">
                Custom reports with date-range selection, summary statistics, and CSV export for compliance and analysis.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-display font-bold">Campus Mapping</h3>
              <p className="text-muted-foreground">
                Interactive map view showing building-level energy consumption with color-coded intensity indicators.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border py-20 lg:py-32 bg-muted/25 dark:bg-muted/10">
        <div className="container">
          <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-card/85 px-8 py-16 text-center shadow-lg backdrop-blur-md lg:px-16">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-display font-bold">
                Ready to Optimize Your Campus Energy?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join leading institutions using SmartGrid to reduce energy costs and carbon footprint.
              </p>
            </div>
            <Button
              onClick={handleDashboardClick}
              size="lg"
              variant="default"
              className="group mt-8"
            >
              Access Dashboard
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="container">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div>Â© 2026 SmartGrid Campus. All rights reserved.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
