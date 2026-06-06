import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { Zap, Wind, Battery, Plug, AlertCircle, TrendingUp } from "lucide-react";
import { useGrid } from "@/contexts/GridContext";
import {
  SENSOR_BASE_POWER,
  getAdjustedPower,
  readPowerAdjustments,
  subscribePowerAdjustments,
  readBatterySocOverride,
  subscribeBatterySoc,
} from "@/lib/powerAdjustments";

type HardwareReading = {
  deviceId: string;
  kind: string;
  value: number;
  unit: string;
  source: string;
  timestamp: number;
};

type HardwarePayload = {
  ok: boolean;
  latest: HardwareReading;
  history: HardwareReading[];
};

type TelemetryUnit = { v: number; c?: number; p?: number };
type TelemetryPayload = {
  solar: TelemetryUnit;
  wind: TelemetryUnit;
  ac: TelemetryUnit;
};

const DEFAULT_METRICS: EnergyMetrics = {
  totalConsumption: 2450,
  renewableGeneration: 1820,
  batterySOC: 78,
};

const DEFAULT_FLOW_DATA: EnergyFlowData[] = [
  { time: "00:00", solar: 0, wind: 120, battery: 450, grid: 1880, consumption: 2450 },
  { time: "04:00", solar: 0, wind: 280, battery: 380, grid: 1690, consumption: 2350 },
  { time: "08:00", solar: 450, wind: 200, battery: 0, grid: 1200, consumption: 1850 },
  { time: "12:00", solar: 950, wind: 150, battery: -200, grid: 550, consumption: 1450 },
  { time: "16:00", solar: 680, wind: 180, battery: 0, grid: 890, consumption: 1750 },
  { time: "20:00", solar: 0, wind: 320, battery: 300, grid: 1830, consumption: 2450 },
  { time: "24:00", solar: 0, wind: 140, battery: 420, grid: 1890, consumption: 2450 },
];

const DEFAULT_SOURCE_BREAKDOWN: SourceBreakdown[] = [
  { name: "Solar", value: 35, color: "hsl(38 92% 50%)" },
  { name: "Wind", value: 28, color: "hsl(200 70% 50%)" },
  { name: "Battery", value: 18, color: "hsl(160 70% 45%)" },
  { name: "Grid", value: 19, color: "hsl(280 60% 50%)" },
];

const DEFAULT_LOAD_PROFILE: LoadProfile[] = [
  { hour: "00", consumption: 2450, renewable: 120 },
  { hour: "02", consumption: 2350, renewable: 280 },
  { hour: "04", consumption: 2200, renewable: 200 },
  { hour: "06", consumption: 2100, renewable: 150 },
  { hour: "08", consumption: 1850, renewable: 650 },
  { hour: "10", consumption: 1650, renewable: 1050 },
  { hour: "12", consumption: 1450, renewable: 1100 },
  { hour: "14", consumption: 1550, renewable: 830 },
  { hour: "16", consumption: 1750, renewable: 860 },
  { hour: "18", consumption: 2050, renewable: 320 },
  { hour: "20", consumption: 2450, renewable: 320 },
  { hour: "22", consumption: 2400, renewable: 140 },
];

function buildFlowData(history: HardwareReading[]) {
  if (!history.length) {
    return DEFAULT_FLOW_DATA;
  }

  return history.slice(0, 7).map((reading, index) => ({
    time: new Date(reading.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    solar: reading.kind.toLowerCase().includes("solar") ? reading.value : index * 20,
    wind: reading.kind.toLowerCase().includes("wind") ? reading.value : index * 15,
    battery: reading.kind.toLowerCase().includes("battery") ? reading.value : index * 10,
    grid: reading.kind.toLowerCase().includes("grid") ? reading.value : index * 25,
    consumption: reading.kind.toLowerCase().includes("consum") ? reading.value : reading.value + 100,
  }));
}

function buildSourceBreakdown(history: HardwareReading[]) {
  if (!history.length) {
    return DEFAULT_SOURCE_BREAKDOWN;
  }

  const values = new Map<string, number>();

  for (const reading of history) {
    const key = reading.kind[0]?.toUpperCase() + reading.kind.slice(1).toLowerCase();
    values.set(key, (values.get(key) ?? 0) + Math.max(0, reading.value));
  }

  return Array.from(values.entries()).slice(0, 4).map(([name, value], index) => ({
    name,
    value,
    color: DEFAULT_SOURCE_BREAKDOWN[index % DEFAULT_SOURCE_BREAKDOWN.length]?.color ?? "hsl(38 92% 50%)",
  }));
}

function buildLoadProfile(history: HardwareReading[]) {
  if (!history.length) {
    return DEFAULT_LOAD_PROFILE;
  }

  return history.slice(0, 12).map((reading, index) => ({
    hour: new Date(reading.timestamp).toLocaleTimeString([], { hour: "2-digit" }),
    consumption: reading.value + index * 10,
    renewable: Math.max(0, reading.value - index * 5),
  }));
}

interface EnergyMetrics {
  totalConsumption: number;
  renewableGeneration: number;
  batterySOC: number;
}

interface EnergyFlowData {
  time: string;
  solar: number;
  wind: number;
  battery: number;
  grid: number;
  consumption: number;
}

interface SourceBreakdown {
  name: string;
  value: number;
  color: string;
}

interface LoadProfile {
  hour: string;
  consumption: number;
  renewable: number;
}

export default function Overview() {
  const [flowData, setFlowData] = useState<EnergyFlowData[]>(DEFAULT_FLOW_DATA);
  const [sourceBreakdown, setSourceBreakdown] = useState<SourceBreakdown[]>(DEFAULT_SOURCE_BREAKDOWN);
  const [loadProfile, setLoadProfile] = useState<LoadProfile[]>(DEFAULT_LOAD_PROFILE);
  const [loading, setLoading] = useState(true);
  const [latestReading, setLatestReading] = useState<HardwareReading | null>(null);
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [batteryOverride, setBatteryOverride] = useState<number | null>(() => readBatterySocOverride());
  const [powerAdjustments, setPowerAdjustments] = useState(readPowerAdjustments());
  const { gridAvailable } = useGrid();

  const liveMetrics = useMemo(() => {
    const baseSolar = Number(telemetry?.solar?.p ?? telemetry?.solar?.v ?? SENSOR_BASE_POWER.solar);
    const baseWind = Number(telemetry?.wind?.p ?? telemetry?.wind?.v ?? SENSOR_BASE_POWER.wind);
    const baseDemand = Number(telemetry?.ac?.p ?? DEFAULT_METRICS.totalConsumption);
    const solarPower = getAdjustedPower(baseSolar, powerAdjustments.solarDelta);
    const windPower = getAdjustedPower(baseWind, powerAdjustments.windDelta);
    const renewableGeneration = solarPower + windPower;
    const totalConsumption = getAdjustedPower(baseDemand, powerAdjustments.demandDelta);
    const batterySOC = Math.max(0, Math.min(100, Math.round(78 + (renewableGeneration - totalConsumption) / 20)));

    return {
      totalConsumption,
      renewableGeneration,
      batterySOC,
      solarPower,
      windPower,
    };
  }, [powerAdjustments, telemetry]);

  const batterySOC = batteryOverride ?? liveMetrics.batterySOC;

  const solarPower = liveMetrics.solarPower;
  const windPower = liveMetrics.windPower;
  const renewableGeneration = liveMetrics.renewableGeneration;
  const metrics = liveMetrics;

  const energyAction = (() => {
    if (!gridAvailable) {
      return {
        title: "Grid unavailable",
        summary: "Use battery support first, keep non-essential loads low, and prepare grid assistance if needed.",
        accent: "border-l-red-600 bg-red-50 dark:bg-red-950/40",
        chip: "bg-red-600",
      };
    }

    if (renewableGeneration >= metrics.totalConsumption) {
      return {
        title: "Renewables are covering demand",
        summary: "Prioritize solar and wind usage, then charge the battery with the remaining surplus.",
        accent: "border-l-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
        chip: "bg-emerald-600",
      };
    }

    if (windPower > solarPower) {
      return {
        title: "Wind is leading today",
        summary: "Use Rule 6 style routing: prioritize wind capture and keep battery charging ready for peaks.",
        accent: "border-l-sky-600 bg-sky-50 dark:bg-sky-950/40",
        chip: "bg-sky-600",
      };
    }

    return {
      title: "Solar-first operating mode",
      summary: "Use Rule 5 style routing: prioritize solar generation and preserve battery headroom for later.",
      accent: "border-l-amber-600 bg-amber-50 dark:bg-amber-950/40",
      chip: "bg-amber-600",
    };
  })();

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
        if (!active) return;

        setConnected(true);
        setTelemetry(telemetryPayload);
        setLatestReading(payload.latest);
        setFlowData(buildFlowData(payload.history));
        setSourceBreakdown(buildSourceBreakdown(payload.history));
        setLoadProfile(buildLoadProfile(payload.history));
      } catch {
        if (!active) return;
        setConnected(false);
        setTelemetry(null);
        setFlowData(DEFAULT_FLOW_DATA);
        setSourceBreakdown(DEFAULT_SOURCE_BREAKDOWN);
        setLoadProfile(DEFAULT_LOAD_PROFILE);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    syncHardware();
    const interval = window.setInterval(syncHardware, 2000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => subscribePowerAdjustments(setPowerAdjustments), []);
  useEffect(() => subscribeBatterySoc(setBatteryOverride), []);

  const KPICard = ({
    icon: Icon,
    label,
    value,
    unit,
    color,
    loading: isLoading,
  }: {
    icon: any;
    label: string;
    value: number | null;
    unit: string;
    color: string;
    loading: boolean;
  }) => (
    <div className="card-premium p-6 space-y-4 min-h-[150px]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold">{value}</span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{
            width: isLoading ? "0%" : `${Math.min(100, (value || 0) / 30)}%`,
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          icon={Zap}
          label="Total Consumption"
          value={metrics?.totalConsumption || 0}
          unit="kW"
          color="bg-[hsl(38_92%_50%)]"
          loading={loading}
        />
        <KPICard
          icon={Wind}
          label="Renewable Generation"
          value={renewableGeneration || metrics?.renewableGeneration || 0}
          unit="kW"
          color="bg-[hsl(200_70%_50%)]"
          loading={loading}
        />
        <KPICard
          icon={Battery}
          label="Battery State of Charge"
          value={batterySOC}
          unit="%"
          color="bg-[hsl(160_70%_45%)]"
          loading={loading}
        />
      </div>

      {/* Today Energy Action */}
      <div className={`card-premium p-6 border-l-4 ${energyAction.accent}`}>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-lg ${energyAction.chip} flex items-center justify-center flex-shrink-0`}>
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-2 flex-1">
            <p className="text-sm text-muted-foreground">Today&apos;s Energy Action</p>
            <h3 className="font-display font-bold text-lg">{energyAction.title}</h3>
            <p className="text-sm text-muted-foreground max-w-3xl">{energyAction.summary}</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Energy Flow Chart */}
        <div className="lg:col-span-2 card-premium p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg">Energy Flow (24h)</h3>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={flowData}>
                  <defs>
                    <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(200 70% 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(200 70% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="solar"
                    stackId="1"
                    stroke="hsl(38 92% 50%)"
                    fillOpacity={1}
                    fill="url(#colorSolar)"
                  />
                  <Area
                    type="monotone"
                    dataKey="wind"
                    stackId="1"
                    stroke="hsl(200 70% 50%)"
                    fillOpacity={1}
                    fill="url(#colorWind)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="card-premium p-6">
          <div className="space-y-4">
            <h3 className="font-display font-bold text-lg">Energy Sources</h3>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={sourceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {sourceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="space-y-2">
              {sourceBreakdown.map((source) => (
                <div key={source.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                    <span className="text-muted-foreground">{source.name}</span>
                  </div>
                  <span className="font-medium">{String(source.value).padStart(2, "0")}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 24-Hour Load Profile */}
      <div className="card-premium p-6">
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg">24-Hour Load Profile</h3>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={loadProfile}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="consumption" fill="hsl(38 92% 50%)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="renewable" fill="hsl(160 70% 45%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Status & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-premium p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[hsl(160_70%_45%)] rounded-lg flex items-center justify-center flex-shrink-0">
              <Battery className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">Battery Status</p>
              <p className="font-display font-bold text-lg">Charging</p>
              <p className="text-xs text-muted-foreground">Optimal conditions for battery charging and health monitoring</p>
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[hsl(200_70%_50%)] rounded-lg flex items-center justify-center flex-shrink-0">
              <Wind className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">Wind Conditions</p>
              <p className="font-display font-bold text-lg">Moderate</p>
              <p className="text-xs text-muted-foreground">Steady wind generation at 280 kW</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Status Summary */}
      <div className={`card-premium p-6 border-l-4 ${gridAvailable ? "border-l-green-600 bg-green-50 dark:bg-green-950" : "border-l-red-600 bg-red-50 dark:bg-red-950"}`}>
        <div className="flex items-start gap-4">
          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${gridAvailable ? "bg-green-600" : "bg-red-600"}`} />
          <div className="space-y-2">
            <h3 className="font-display font-bold">Grid Status: {gridAvailable ? "Available" : "Unavailable"}</h3>
            <p className="text-sm text-muted-foreground">
              {gridAvailable
                ? "Grid is stable and ready for coordination."
                : "Grid is marked unavailable and decision rules will switch to independence mode."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
