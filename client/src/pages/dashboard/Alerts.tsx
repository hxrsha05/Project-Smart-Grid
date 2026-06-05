import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  timestamp: string;
  acknowledged: boolean;
  source: string;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading alerts
    const timer = setTimeout(() => {
      setAlerts([
        {
          id: "alert-1",
          title: "Battery Charging Initiated",
          description: "Battery charging started due to optimal renewable generation conditions",
          severity: "info",
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          acknowledged: false,
          source: "Battery Management System",
        },
        {
          id: "alert-2",
          title: "High Solar Generation",
          description: "Solar generation exceeds 80% capacity. Consider running heavy loads.",
          severity: "warning",
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          acknowledged: false,
          source: "Energy Sources",
        },
        {
          id: "alert-3",
          title: "Grid Stability Warning",
          description: "Grid frequency deviation detected. Monitoring closely.",
          severity: "warning",
          timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
          acknowledged: true,
          source: "Grid Coordination",
        },
        {
          id: "alert-4",
          title: "Battery Health Alert",
          description: "Battery cycle count approaching maintenance threshold. Schedule inspection.",
          severity: "critical",
          timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
          acknowledged: false,
          source: "Battery Management System",
        },
        {
          id: "alert-5",
          title: "Renewable Generation Low",
          description: "Solar and wind generation below 30% of demand. Grid support increasing.",
          severity: "warning",
          timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
          acknowledged: true,
          source: "Energy Sources",
        },
        {
          id: "alert-6",
          title: "System Performance Optimal",
          description: "All systems operating within normal parameters.",
          severity: "info",
          timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
          acknowledged: true,
          source: "System Monitor",
        },
      ]);
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert
      )
    );
    toast.success("Alert acknowledged");
  };

  const handleDismiss = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    toast.success("Alert dismissed");
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "all") return true;
    return alert.severity === filter;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800";
      case "warning":
        return "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800";
      case "info":
        return "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "warning":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "info":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const criticalCount = alerts.filter((a) => a.severity === "critical" && !a.acknowledged).length;
  const warningCount = alerts.filter((a) => a.severity === "warning" && !a.acknowledged).length;
  const infoCount = alerts.filter((a) => a.severity === "info" && !a.acknowledged).length;

  return (
    <div className="space-y-8">
      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-premium p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Critical Alerts</p>
              <p className="text-3xl font-display font-bold">{criticalCount}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Warnings</p>
              <p className="text-3xl font-display font-bold">{warningCount}</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Info Messages</p>
              <p className="text-3xl font-display font-bold">{infoCount}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {(["all", "critical", "warning", "info"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === "all" ? "All Alerts" : f}
          </Button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : filteredAlerts.length === 0 ? (
          <div className="card-premium p-8 text-center text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No {filter === "all" ? "" : filter} alerts</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`card-premium p-6 border-l-4 space-y-3 ${getSeverityColor(
                alert.severity
              )}`}
              style={{
                borderLeftColor:
                  alert.severity === "critical"
                    ? "rgb(220, 38, 38)"
                    : alert.severity === "warning"
                      ? "rgb(234, 88, 12)"
                      : "rgb(37, 99, 235)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold">{alert.title}</h3>
                      {alert.acknowledged && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Acknowledged
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    <div className="flex items-center gap-4 pt-2">
                      <span className="text-xs text-muted-foreground">
                        {alert.source}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(alert.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!alert.acknowledged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(alert.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alert History Info */}
      <div className="card-premium p-6 bg-muted/30">
        <h3 className="font-display font-bold text-lg mb-3">Alert Management</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The alert system monitors all campus energy systems and provides real-time notifications based on severity levels:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <span><strong>Critical:</strong> Immediate action required. System stability at risk.</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <span><strong>Warning:</strong> Attention needed. Conditions may worsen if not addressed.</span>
          </li>
          <li className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span><strong>Info:</strong> Informational messages about system status and operations.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
