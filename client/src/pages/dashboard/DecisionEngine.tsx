import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Clock, Wind, Battery, Plug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useGrid } from "@/contexts/GridContext";
import {
  SENSOR_BASE_POWER,
  readBatterySocOverride,
  getAdjustedPower,
  readPowerAdjustments,
  subscribeBatterySoc,
  subscribePowerAdjustments,
  writePowerAdjustments,
} from "@/lib/powerAdjustments";

interface Decision {
  id: string;
  rule: number;
  title: string;
  description: string;
  status: "active" | "inactive" | "pending";
  conditions: string[];
  actions: string[];
  timestamp: string;
  priority: "critical" | "high" | "medium" | "low";
}

interface EnergyState {
  solarEnergy: number;
  windEnergy: number;
  solarDelta: number;
  windDelta: number;
  renewableEnergy: number;
  demand: number;
  batteryLevel: number;
  gridAvailable: boolean;
  weather: "sunny" | "windy" | "cloudy" | "stormy";
}

interface HardwareReading {
  deviceId: string;
  kind: string;
  value: number;
  unit: string;
  source: string;
  timestamp: number;
}

interface HardwarePayload {
  ok: boolean;
  latest: HardwareReading;
  history: HardwareReading[];
}

type TelemetryUnit = { v: number; c?: number; p?: number };
type TelemetryPayload = {
  solar: TelemetryUnit;
  wind: TelemetryUnit;
  ac: TelemetryUnit;
};

const DEFAULT_HARDWARE_READING: HardwareReading = {
  deviceId: "demo-device",
  kind: "consumption",
  value: 2450,
  unit: "kW",
  source: "boot",
  timestamp: Date.now(),
};

export default function DecisionEngine() {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [energyState, setEnergyState] = useState<EnergyState | null>(null);
  const [hardwareReading, setHardwareReading] = useState<HardwareReading>(DEFAULT_HARDWARE_READING);
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [powerAdjustments, setPowerAdjustments] = useState(readPowerAdjustments());
  const [batteryOverride, setBatteryOverride] = useState<number | null>(() => readBatterySocOverride());
  const [loading, setLoading] = useState(true);
  const [generated, setGenerated] = useState(false);
  // show the current energy state immediately (use defaults until data arrives)
  const [initialized, setInitialized] = useState(true);
  const { gridAvailable: gridAvailableOverride } = useGrid();

  const buildEnergyState = (): EnergyState => {
    const adjustments = powerAdjustments;
    const solarBase = Number(telemetry?.solar?.p ?? telemetry?.solar?.v ?? SENSOR_BASE_POWER.solar);
    const windBase = Number(telemetry?.wind?.p ?? telemetry?.wind?.v ?? SENSOR_BASE_POWER.wind);
    const demand = Number(telemetry?.ac?.p ?? DEFAULT_HARDWARE_READING.value);
    const solarEnergy = getAdjustedPower(solarBase, adjustments.solarDelta);
    const windEnergy = getAdjustedPower(windBase, adjustments.windDelta);
    const adjustedDemand = getAdjustedPower(demand, adjustments.demandDelta);
    const derivedBatteryLevel = Math.max(0, Math.min(100, Math.round(78 + (solarEnergy + windEnergy - adjustedDemand) / 20)));
    const latestKind = hardwareReading.kind.toLowerCase();
    const batteryLevel = batteryOverride ?? (latestKind.includes("battery") || latestKind.includes("soc")
      ? hardwareReading.value
      : derivedBatteryLevel);
    const gridAvailableFromHardware = latestKind.includes("grid")
      ? hardwareReading.value >= 0
      : latestKind.includes("outage")
        ? false
        : true;
    const gridAvailable = typeof gridAvailableOverride === "boolean" ? gridAvailableOverride : gridAvailableFromHardware;
    const weather: EnergyState["weather"] = windEnergy > solarEnergy ? "windy" : "sunny";

    return {
      solarEnergy,
      windEnergy,
      solarDelta: adjustments.solarDelta,
      windDelta: adjustments.windDelta,
      renewableEnergy: solarEnergy + windEnergy,
      demand: adjustedDemand,
      batteryLevel,
      gridAvailable,
      weather,
    };
  };

  const syncDecision = async () => {
    setLoading(true);
    try {
      const [telemetryResponse, hardwareResponse] = await Promise.all([
        fetch("/api/data", { credentials: "include" }),
        fetch("/api/hardware/latest", { credentials: "include" }),
      ]);

      if (!telemetryResponse.ok || !hardwareResponse.ok) {
        throw new Error("Hardware feed unavailable");
      }

      const telemetryPayload = (await telemetryResponse.json()) as TelemetryPayload;
      const payload = (await hardwareResponse.json()) as HardwarePayload;

      setTelemetry(telemetryPayload);
      if (payload?.latest) {
        setHardwareReading(payload.latest);
      }

      recomputeDecision(buildEnergyState());
      setGenerated(true);
    } catch (error) {
      console.error("Generate failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const syncHardware = async () => {
      try {
        const [telemetryResponse, hardwareResponse] = await Promise.all([
          fetch("/api/data", { credentials: "include" }),
          fetch("/api/hardware/latest", { credentials: "include" }),
        ]);

        if (!telemetryResponse.ok || !hardwareResponse.ok) {
          throw new Error("Hardware feed unavailable");
        }

        const telemetryPayload = (await telemetryResponse.json()) as TelemetryPayload;
        const payload = (await hardwareResponse.json()) as HardwarePayload;
        if (!active || !payload?.latest) return;
        setTelemetry(telemetryPayload);
        setHardwareReading(payload.latest);
      } catch {
        if (!active) return;
        setHardwareReading(DEFAULT_HARDWARE_READING);
      }
    };

    syncHardware();
    const interval = window.setInterval(syncHardware, 2000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => subscribeBatterySoc(setBatteryOverride), []);
  useEffect(() => subscribePowerAdjustments(setPowerAdjustments), []);

  const formatAdjustment = (value: number) => {
    if (value === 0) return "0";
    return `${value > 0 ? "+" : ""}${value}`;
  };

  const formatTelemetryValue = (value: number | undefined, unit: string) =>
    typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)} ${unit}` : "--";

  const recomputeDecision = (state: EnergyState) => {
    const selectedDecision =
      (state.renewableEnergy < state.demand * 0.3 && state.batteryLevel < 20 && !state.gridAvailable && {
        id: "rule-4",
        rule: 4,
        title: "Critical Shortage Mode",
        description: "Renewable far below demand, battery low, grid unavailable",
        status: "active" as const,
        conditions: ["Renewable < 30% of demand", "Battery < 20%", "Grid unavailable"],
        actions: [
          "Activate critical shortage mode",
          "Reduce non-essential loads",
          "Prioritize critical systems",
          "Alert facility management",
        ],
        priority: "critical" as const,
      }) ||
      (!state.gridAvailable && {
        id: "rule-7",
        rule: 7,
        title: "Grid Independence Mode",
        description: "Grid is unavailable",
        status: "active" as const,
        conditions: ["Grid unavailable"],
        actions: [
          "Rely only on renewable energy",
          "Activate battery backup",
          "Monitor system stability",
          "Prepare for extended outage",
        ],
        priority: "critical" as const,
      }) ||
      (state.renewableEnergy > state.demand && state.batteryLevel > 95 && {
        id: "rule-3",
        rule: 3,
        title: "Utilize Excess Power",
        description: "Renewable exceeds demand and battery is full",
        status: "active" as const,
        conditions: ["Renewable > Demand", "Battery at capacity (>95%)"],
        actions: ["Suggest running heavy loads", "Export excess to grid", "Activate demand response"],
        priority: "medium" as const,
      }) ||
      (state.renewableEnergy < state.demand && state.batteryLevel < 30 && state.gridAvailable && {
        id: "rule-2",
        rule: 2,
        title: "Minimize Grid Usage",
        description: "Renewable below demand, battery low, grid available",
        status: "active" as const,
        conditions: ["Renewable < Demand", "Battery level < 30%", "Grid is available"],
        actions: ["Use minimal grid power", "Prioritize renewable usage", "Preserve battery for critical loads"],
        priority: "high" as const,
      }) ||
      (state.renewableEnergy >= state.demand && {
        id: "rule-1",
        rule: 1,
        title: "Maximize Renewable Usage",
        description: "Renewable energy is greater than or equal to demand",
        status: "active" as const,
        conditions: ["Renewable generation ≥ Demand", "Battery not at capacity"],
        actions: ["Use renewables first", "Charge battery if possible", "Minimize grid import"],
        priority: "high" as const,
      }) ||
      (state.weather === "windy" && {
        id: "rule-6",
        rule: 6,
        title: "Wind Power Priority",
        description: "Windy weather detected",
        status: "active" as const,
        conditions: ["Weather: Windy"],
        actions: ["Prioritize wind power continuously", "Maximize wind energy capture", "Reduce grid dependency"],
        priority: "high" as const,
      }) ||
      (state.weather === "sunny" && {
        id: "rule-5",
        rule: 5,
        title: "Solar Optimization",
        description: "Sunny weather detected",
        status: "active" as const,
        conditions: ["Weather: Sunny"],
        actions: [
          "Prioritize solar power usage",
          "Charge battery at maximum rate",
          "Defer non-critical loads to evening",
        ],
        priority: "high" as const,
      }) || {
        id: "rule-none",
        rule: 0,
        title: "No Dominant Rule Matched",
        description: "The current state does not trigger a higher-priority routing rule",
        status: "pending" as const,
        conditions: [
          `Adjusted solar: ${state.solarEnergy.toFixed(2)} kW`,
          `Adjusted wind: ${state.windEnergy.toFixed(2)} kW`,
          `Renewable total: ${state.renewableEnergy.toFixed(2)} kW`,
        ],
        actions: ["Continue monitoring the adjusted energy state"],
        priority: "low" as const,
      };

    setEnergyState(state);
    setDecision({
      ...selectedDecision,
      timestamp: new Date().toISOString(),
    });
    setLoading(false);
  };



  // Only subscribe to automatic recompute when user has generated a decision
  useEffect(() => {
    if (!generated) return () => {};
    const syncState = () => recomputeDecision(buildEnergyState());
    const unsubscribe = subscribePowerAdjustments(syncState);
    return () => unsubscribe();
  }, [generated]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Energy State */}
      <div className="card-premium p-6">
        <h3 className="font-display font-bold text-lg mb-4">Current Energy State</h3>
        
        <p className="mb-4 text-sm text-muted-foreground">
          Live hardware signal: {hardwareReading.deviceId} · {hardwareReading.kind} · {hardwareReading.value} {hardwareReading.unit}
        </p>
        {/* Always show current energy state; use skeleton only if explicit loading during Generate */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Solar Energy</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-display font-bold">{energyState?.solarEnergy}</span>
                <span className="text-sm text-muted-foreground">kW</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sensor {SENSOR_BASE_POWER.solar} kW{energyState?.solarDelta ? ` · ${energyState.solarDelta > 0 ? "+" : ""}${energyState.solarDelta} kW adjust` : ""}
              </p>
              <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Voltage</span>
                  <span className="font-medium text-foreground">{formatTelemetryValue(telemetry?.solar?.v, "V")}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Current</span>
                  <span className="font-medium text-foreground">{formatTelemetryValue(telemetry?.solar?.c, "mA")}</span>
                </div>
              </div>
              <div className="pt-2">
                <Slider
                  value={[powerAdjustments.solarDelta]}
                  min={-2000}
                  max={2000}
                  step={10}
                  onValueChange={([value]) =>
                    writePowerAdjustments({
                      ...powerAdjustments,
                      solarDelta: value ?? 0,
                    })
                  }
                  className="h-6 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-muted [&_[data-slot=slider-range]]:bg-[hsl(38_92%_50%)] [&_[data-slot=slider-thumb]]:border-[hsl(38_92%_50%)]"
                />
                <p className="mt-1 text-xs text-muted-foreground">Adjust solar: {formatAdjustment(powerAdjustments.solarDelta)} kW</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Wind Energy</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-display font-bold">{energyState?.windEnergy}</span>
                <span className="text-sm text-muted-foreground">kW</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sensor {SENSOR_BASE_POWER.wind} kW{energyState?.windDelta ? ` · ${energyState.windDelta > 0 ? "+" : ""}${energyState.windDelta} kW adjust` : ""}
              </p>
              <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Voltage</span>
                  <span className="font-medium text-foreground">{formatTelemetryValue(telemetry?.wind?.v, "V")}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Current</span>
                  <span className="font-medium text-foreground">{formatTelemetryValue(telemetry?.wind?.c, "mA")}</span>
                </div>
              </div>
              <div className="pt-2">
                <Slider
                  value={[powerAdjustments.windDelta]}
                  min={-1000}
                  max={1000}
                  step={5}
                  onValueChange={([value]) =>
                    writePowerAdjustments({
                      ...powerAdjustments,
                      windDelta: value ?? 0,
                    })
                  }
                  className="h-6 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-muted [&_[data-slot=slider-range]]:bg-[hsl(200_70%_50%)] [&_[data-slot=slider-thumb]]:border-[hsl(200_70%_50%)]"
                />
                <p className="mt-1 text-xs text-muted-foreground">Adjust wind: {formatAdjustment(powerAdjustments.windDelta)} kW</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Renewable Energy</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-display font-bold">
                  {typeof energyState?.renewableEnergy === "number" ? energyState!.renewableEnergy.toFixed(2) : "--"}
                </span>
                <span className="text-sm text-muted-foreground">kW</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Demand</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-display font-bold">
                  {energyState?.demand}
                </span>
                <span className="text-sm text-muted-foreground">kW</span>
              </div>
              <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Grid Voltage</span>
                  <span className="font-medium text-foreground">{formatTelemetryValue(telemetry?.ac?.v, "V")}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Assumed Load Current</span>
                  <span className="font-medium text-foreground">{formatTelemetryValue(telemetry?.ac?.c, "A")}</span>
                </div>
              </div>
              <div className="pt-2">
                <Slider
                  value={[powerAdjustments.demandDelta]}
                  min={-2000}
                  max={2000}
                  step={10}
                  onValueChange={([value]) =>
                    writePowerAdjustments({
                      ...powerAdjustments,
                      demandDelta: value ?? 0,
                    })
                  }
                  className="h-6 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-muted [&_[data-slot=slider-range]]:bg-[hsl(24_95%_53%)] [&_[data-slot=slider-thumb]]:border-[hsl(24_95%_53%)]"
                />
                <p className="mt-1 text-xs text-muted-foreground">Adjust demand: {formatAdjustment(powerAdjustments.demandDelta)} kW</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Battery Level</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-display font-bold">
                  {energyState?.batteryLevel}
                </span>
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Grid Status</p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    energyState?.gridAvailable ? "bg-green-600" : "bg-red-600"
                  }`}
                />
                <span className="text-sm font-medium">
                  {energyState?.gridAvailable ? "Available" : "Unavailable"}
                </span>
              </div>
            </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={syncDecision}>
          Generate
        </Button>
      </div>

      {/* Active Decisions */}
      <div className="space-y-4">
        <h2 className="font-display font-bold text-2xl">Active Decision</h2>
        {!generated ? (
          <div className="card-premium p-8 text-center text-muted-foreground">
            <p>Click <strong>Generate</strong> to initialize the decision engine and show results.</p>
          </div>
        ) : loading ? (
          <Skeleton className="h-96 w-full" />
        ) : !decision ? (
          <div className="card-premium p-8 text-center text-muted-foreground">
            <p>No active decisions at this time</p>
          </div>
        ) : (
          <div className="card-premium p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  {getStatusIcon(decision.status)}
                  <h3 className="font-display font-bold text-lg">
                    Rule {decision.rule}: {decision.title}
                  </h3>
                </div>
                <p className="text-muted-foreground">{decision.description}</p>
              </div>
              <Badge className={getPriorityColor(decision.priority)}>
                {decision.priority.toUpperCase()}
              </Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Conditions</p>
                <ul className="space-y-1">
                  {decision.conditions.map((condition, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground mt-1">•</span>
                      <span>{condition}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Actions</p>
                <ul className="space-y-1">
                  {decision.actions.map((action, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-accent mt-1">→</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Decision Rules Reference */}
      <div className="card-premium p-6">
        <h3 className="font-display font-bold text-lg mb-4">Decision Rules Reference</h3>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The system intelligently routes power based on these 7 rules:
          </p>
          <ol className="space-y-2 text-sm">
            <li><strong>Rule 1:</strong> Renewable ≥ Demand → Use renewables first, charge battery</li>
            <li><strong>Rule 2:</strong> Renewable &lt; Demand, Battery Low, Grid Available → Minimal grid usage</li>
            <li><strong>Rule 3:</strong> Renewable &gt; Demand, Battery Full → Run heavy loads, export excess</li>
            <li><strong>Rule 4:</strong> Critical Shortage → Activate shortage mode, reduce non-essential loads</li>
            <li><strong>Rule 5:</strong> Sunny Weather → Prioritize solar, charge battery</li>
            <li><strong>Rule 6:</strong> Windy Weather → Prioritize wind power continuously</li>
            <li><strong>Rule 7:</strong> Grid Unavailable → Rely on renewables and battery backup</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
