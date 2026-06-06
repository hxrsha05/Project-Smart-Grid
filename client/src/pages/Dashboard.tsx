import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X, LogOut, Gauge, Leaf, BatteryCharging, Network, BrainCircuit, FileBarChart } from "lucide-react";
import Overview from "@/pages/dashboard/Overview";
import BatteryManagement from "@/pages/dashboard/BatteryManagement";
import GridCoordination from "@/pages/dashboard/GridCoordination";
import DecisionEngine from "@/pages/dashboard/DecisionEngine";
import Predictions from "@/pages/dashboard/Predictions";
import Alerts from "@/pages/dashboard/Alerts";
import Reports from "@/pages/dashboard/Reports";
import CampusMap from "@/pages/dashboard/CampusMap";
import ThemeToggle from "@/components/ThemeToggle";
import { showPageToast } from "@/components/PageToast";

const NAVIGATION_ITEMS = [
  { id: "overview", label: "Overview", path: "/dashboard/overview" },
  { id: "battery", label: "Battery Management", path: "/dashboard/battery" },
  { id: "grid", label: "Grid Coordination", path: "/dashboard/grid" },
  { id: "engine", label: "Decision Engine", path: "/dashboard/engine" },
  { id: "predictions", label: "Predictions", path: "/dashboard/predictions" },
  { id: "alerts", label: "Alerts", path: "/dashboard/alerts" },
  { id: "reports", label: "Reports", path: "/dashboard/reports" },
];

const PAGE_TOASTS: Record<string, { title: string; description: string; icon: React.ReactNode; accentClassName: string }> = {
  overview: {
    title: "Live Energy Overview",
    description: "Real-time consumption, renewable generation, and grid flow are being monitored.",
    icon: <Gauge className="h-4 w-4" />,
    accentClassName: "bg-cyan-500",
  },
  battery: {
    title: "Battery Management",
    description: "Battery banks are charging efficiently and health metrics stay within range.",
    icon: <BatteryCharging className="h-4 w-4" />,
    accentClassName: "bg-emerald-500",
  },
  grid: {
    title: "Grid Status: Optimal",
    description: "Grid is stable and operating within normal parameters with minimal dependency.",
    icon: <Network className="h-4 w-4" />,
    accentClassName: "bg-blue-500",
  },
  engine: {
    title: "Decision Engine",
    description: "Optimization rules are balancing renewable usage, battery flow, and grid support.",
    icon: <BrainCircuit className="h-4 w-4" />,
    accentClassName: "bg-violet-500",
  },
  predictions: {
    title: "Weather Predictions",
    description: "Tomorrow's weather outlook is mapped to energy strategy suggestions and renewable planning.",
    icon: <Leaf className="h-4 w-4" />,
    accentClassName: "bg-sky-500",
  },
  reports: {
    title: "Reports Ready",
    description: "Historical energy data, efficiency summaries, and exports are available.",
    icon: <FileBarChart className="h-4 w-4" />,
    accentClassName: "bg-amber-500",
  },
};

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const lastToastId = useRef<string | null>(null);

  const currentPath = location.split("?")[0];
  const activeItem = NAVIGATION_ITEMS.find((item) => item.path === currentPath) || NAVIGATION_ITEMS[0];

  useEffect(() => {
    if (activeItem.id === "alerts") {
      lastToastId.current = activeItem.id;
      return;
    }

    if (lastToastId.current === activeItem.id) {
      return;
    }

    const pageToast = PAGE_TOASTS[activeItem.id];
    if (!pageToast) {
      return;
    }

    showPageToast(pageToast);

    lastToastId.current = activeItem.id;
  }, [activeItem.id]);

  useEffect(() => {
    // If user navigates to /dashboard, redirect to the default overview route
    if (currentPath === "/dashboard") {
      setLocation("/dashboard/overview");
    }
  }, [currentPath, setLocation]);

  const renderContent = () => {
    switch (activeItem.id) {
      case "overview":
        return <Overview />;
      case "battery":
        return <BatteryManagement />;
      case "grid":
        return <GridCoordination />;
      case "engine":
        return <DecisionEngine />;
      case "predictions":
        return <Predictions />;
      case "alerts":
        return <Alerts />;
      case "reports":
        return <Reports />;
      default:
        return <Overview />;
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-card border-r border-border transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="font-display font-bold text-lg">SmartGrid</span>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto">
          {NAVIGATION_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setLocation(item.path)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 ease-out ${
                activeItem.id === item.id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <div className="px-4 py-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">User</p>
            <p className="text-sm font-medium truncate">{user?.name || user?.email || "Campus Operator"}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="border-b border-border bg-card sticky top-0 z-40">
          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-muted rounded-lg transition-all duration-300 ease-out"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <h1 className="text-lg font-display font-bold">{activeItem.label}</h1>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="w-2" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
