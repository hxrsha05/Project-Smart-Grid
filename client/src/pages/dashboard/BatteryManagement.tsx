import { useState, useEffect } from "react";
import { Battery, TrendingUp, AlertCircle } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  readBatterySocOverride,
  subscribeBatterySoc,
  writeBatterySocOverride,
} from "@/lib/powerAdjustments";

interface BatteryData {
  time: string;
  soc: number;
  current: number;
  voltage: number;
}

interface BatteryBank {
  id: string;
  name: string;
  soc: number;
  health: number;
  cycles: number;
  temperature: number;
  status: "charging" | "discharging" | "idle";
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

function buildBatterySnapshot(history: HardwareReading[]) {
  const latest = history[0];
  const currentValue = Number(latest?.value ?? 2450);
  const currentKind = String(latest?.kind ?? "consumption").toLowerCase();
  const soc = Math.max(0, Math.min(100, Math.round(78 + (currentValue - 2450) / 50)));
  const health = Math.max(70, Math.min(100, 96 - Math.floor(history.length / 3)));
  const cycles = 2100 + history.length * 4;
  const temperature = currentKind.includes("power") ? 28 + Math.round((currentValue - 100) / 500) : 28;
  const status: BatteryBank["status"] = currentKind.includes("solar") || currentKind.includes("wind")
    ? "charging"
    : currentKind.includes("outage")
      ? "idle"
      : "discharging";

  return {
    bank: {
      id: "bank-1",
      name: "Bank A (LiFePO4)",
      soc,
      health,
      cycles,
      temperature,
      status,
    } satisfies BatteryBank,
    chargeData: history.slice(0, 7).map((reading, index) => ({
      time: new Date(reading.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      soc: Math.max(0, Math.min(100, Math.round(78 + (Number(reading.value) - 2450) / 50) - index)),
      current: reading.kind.toLowerCase().includes("power") ? Number(reading.value) : Number(reading.value) - 100,
      voltage: reading.kind.toLowerCase().includes("voltage") ? Number(reading.value) : 480 + index,
    })),
  };
}

export default function BatteryManagement() {
  const [chargeData, setChargeData] = useState<BatteryData[]>([]);
  const [batteryBanks, setBatteryBanks] = useState<BatteryBank[]>([]);
  const [capacityAdjusted, setCapacityAdjusted] = useState<number>(2400);
  const capacityOriginal = 2400;
  const [socAdjusted, setSocAdjusted] = useState<number | null>(() => readBatterySocOverride());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadBatteryData = async () => {
      try {
        const response = await fetch("/api/hardware/latest", { credentials: "include" });
        if (!response.ok) {
          throw new Error(`Hardware feed unavailable (${response.status})`);
        }

        const payload = (await response.json()) as HardwarePayload;
        if (!active) return;

        const snapshot = buildBatterySnapshot(payload.history);
        setChargeData(snapshot.chargeData);
        setBatteryBanks([snapshot.bank]);
        if (readBatterySocOverride() === null) {
          setSocAdjusted(snapshot.bank.soc);
        }
      } catch {
        if (!active) return;
        setChargeData([]);
        setBatteryBanks([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBatteryData();
    const timer = window.setInterval(loadBatteryData, 2000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => subscribeBatterySoc(setSocAdjusted), []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "charging":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "discharging":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "idle":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "charging":
        return "↑ Charging";
      case "discharging":
        return "↓ Discharging";
      case "idle":
        return "= Idle";
      default:
        return status;
    }
  };

  const avgHealth = batteryBanks.length > 0
    ? Math.round(batteryBanks.reduce((sum, bank) => sum + bank.health, 0) / batteryBanks.length)
    : 0;

  return (
    <div className="space-y-8">
      {/* Overall Battery Status: show only Average Health and Capacity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <div className="card-premium p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Average Health</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold">{avgHealth}</span>
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <Progress value={avgHealth} className="h-2" />
          </div>
        </div>

        <div className="card-premium p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Capacity</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold">{capacityAdjusted}</span>
              <span className="text-sm text-muted-foreground">kWh</span>
            </div>
            <div className="pt-3">
              <Slider
                value={[capacityAdjusted]}
                min={500}
                max={5000}
                step={50}
                onValueChange={([val]) => setCapacityAdjusted(val ?? capacityOriginal)}
                className="h-6 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-muted [&_[data-slot=slider-range]]:bg-[hsl(160_70%_45%)] [&_[data-slot=slider-thumb]]:border-[hsl(160_70%_45%)]"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Usable capacity</p>
          </div>
        </div>
      </div>

      {/* Battery Banks */}
      <div className="space-y-4">
        <h2 className="font-display font-bold text-2xl">Battery Banks</h2>
        {loading ? (
          <>
            <Skeleton className="h-32 w-full" />
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            {batteryBanks.map((bank) => (
              <div key={bank.id} className="card-premium p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-bold">{bank.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(bank.status)}`}>
                        {getStatusIcon(bank.status)}
                      </span>
                    </p>
                  </div>
                  <Battery className="w-6 h-6 text-muted-foreground" />
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">State of Charge</span>
                      <span className="font-medium">{socAdjusted ?? bank.soc}%</span>
                    </div>
                    <Progress value={socAdjusted ?? bank.soc} className="h-2" />
                    <div className="pt-3">
                      <Slider
                        value={[socAdjusted ?? bank.soc]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={([val]) => {
                          const nextSoc = val ?? bank.soc;
                          setSocAdjusted(nextSoc);
                          writeBatterySocOverride(nextSoc);
                        }}
                        className="h-6 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-muted [&_[data-slot=slider-range]]:bg-[hsl(160_70%_45%)] [&_[data-slot=slider-thumb]]:border-[hsl(160_70%_45%)]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Health</span>
                      <span className="font-medium">{bank.health}%</span>
                    </div>
                    <Progress value={bank.health} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Cycles</p>
                      <p className="font-medium">{bank.cycles}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Temp</p>
                      <p className="font-medium">{bank.temperature}°C</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charge/Discharge Curve */}
      <div className="card-premium p-6">
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg">State of Charge (24h)</h3>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chargeData}>
                <defs>
                  <linearGradient id="colorSOC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160 70% 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160 70% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="soc"
                  stroke="hsl(160 70% 45%)"
                  fillOpacity={1}
                  fill="url(#colorSOC)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Current and Voltage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-premium p-6">
          <div className="space-y-4">
            <h3 className="font-display font-bold text-lg">Charge Current (24h)</h3>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chargeData}>
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
                  <Line
                    type="monotone"
                    dataKey="current"
                    stroke="hsl(38 92% 50%)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="space-y-4">
            <h3 className="font-display font-bold text-lg">Voltage (24h)</h3>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chargeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" domain={[475, 500]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="voltage"
                    stroke="hsl(200 70% 50%)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Maintenance Alert */}
      <div className="card-premium p-6 border-l-4 border-l-orange-600 bg-orange-50 dark:bg-orange-950">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-display font-bold">Maintenance Reminder</h3>
            <p className="text-sm text-muted-foreground">
              Battery cycle count is approaching 50% of recommended maintenance threshold (2500/5000 cycles). Schedule inspection within the next 30 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
