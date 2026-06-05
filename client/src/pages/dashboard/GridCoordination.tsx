import { useState, useEffect } from "react";
import { Plug, TrendingUp, TrendingDown, AlertCircle, MapPin } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useGrid } from "@/contexts/GridContext";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import CampusMap from "./CampusMap";

interface GridData {
  time: string;
  frequency: number;
  voltage: number;
  import: number;
  export: number;
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

function buildGridData(history: HardwareReading[]): GridData[] {
  if (!history.length) return [];

  return history.slice(0, 7).map((reading, index) => {
    const kind = reading.kind.toLowerCase();
    const value = Number(reading.value);
    const baseFrequency = 50 + (kind.includes("solar") ? 0.02 : kind.includes("wind") ? 0.01 : 0);

    return {
      time: new Date(reading.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      frequency: Number((baseFrequency - index * 0.002).toFixed(3)),
      voltage: kind.includes("voltage") ? value : 230 + index,
      import: kind.includes("power") ? value : Math.max(0, 1000 + index * 120),
      export: kind.includes("solar") || kind.includes("wind") ? Math.max(0, value - 50) : index * 10,
    };
  });
}

export default function GridCoordination() {
  const [gridData, setGridData] = useState<GridData[]>([]);
  const [loading, setLoading] = useState(true);

function GridStatusToggle() {
  const { gridAvailable, setGridAvailable } = useGrid();
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={gridAvailable ? "default" : "outline"}
        className={gridAvailable ? "bg-green-600 text-white" : ""}
        onClick={() => setGridAvailable(true)}
      >
        Available
      </Button>
      <Button
        variant={!gridAvailable ? "default" : "outline"}
        className={!gridAvailable ? "bg-red-600 text-white" : ""}
        onClick={() => setGridAvailable(false)}
      >
        Unavailable
      </Button>
    </div>
  );
}
  const [showMap, setShowMap] = useState(false);
  const { gridAvailable } = useGrid();
  const [gridUnits, setGridUnits] = useState(178);
  const [unitRate, setUnitRate] = useState(5);

  useEffect(() => {
    let active = true;

    const loadGridData = async () => {
      try {
        const response = await fetch("/api/hardware/latest", { credentials: "include" });
        if (!response.ok) {
          throw new Error(`Hardware feed unavailable (${response.status})`);
        }

        const payload = (await response.json()) as HardwarePayload;
        if (!active) return;
        setGridData(buildGridData(payload.history));
      } catch {
        if (!active) return;
        setGridData([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadGridData();
    const timer = window.setInterval(loadGridData, 2000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (showMap) {
    return (
      <div className="space-y-8">
        <button
          onClick={() => setShowMap(false)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          ← Back to Grid Coordination
        </button>
        <CampusMap />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Grid Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-premium p-6">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Grid Frequency</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold">50.02</span>
              <span className="text-sm text-muted-foreground">Hz</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full" />
              <span className="text-xs text-muted-foreground">Within normal range</span>
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Grid Voltage</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold">230</span>
              <span className="text-sm text-muted-foreground">V</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full" />
              <span className="text-xs text-muted-foreground">Nominal voltage</span>
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Grid Status</p>
            <GridStatusToggle />
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full mt-1 ${gridAvailable ? 'bg-green-600' : 'bg-red-600'}`} />
              <span className="text-xs text-muted-foreground">{gridAvailable ? 'Connected and stable' : 'Disconnected / unavailable'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Usage Calculator */}
      <div className="card-premium p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Grid Usage Calculator</p>
            <h3 className="font-display font-bold text-lg">Usage cost based on energy units</h3>
            <p className="text-xs text-muted-foreground">Default rate is Rs 5 per unit. Adjust units and rate to calculate the bill.</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <TrendingDown className="w-7 h-7 text-purple-600" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Grid Units Used</span>
              <span className="font-medium">{gridUnits} units</span>
            </div>
            <Slider
              value={[gridUnits]}
              min={0}
              max={1000}
              step={1}
              onValueChange={([value]) => setGridUnits(value ?? 0)}
              className="h-6 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-muted [&_[data-slot=slider-range]]:bg-[hsl(280_60%_50%)] [&_[data-slot=slider-thumb]]:border-[hsl(280_60%_50%)]"
            />

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rate per Unit</span>
                <span className="font-medium">Rs {unitRate}</span>
              </div>
              <Slider
                value={[unitRate]}
                min={1}
                max={20}
                step={1}
                onValueChange={([value]) => setUnitRate(value ?? 5)}
                className="h-6 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-muted [&_[data-slot=slider-range]]:bg-[hsl(200_70%_50%)] [&_[data-slot=slider-thumb]]:border-[hsl(200_70%_50%)]"
              />
            </div>
          </div>

          <div className="card-premium p-6 bg-muted/40">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Estimated Cost</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold">Rs {(gridUnits * unitRate).toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {gridUnits} units × Rs {unitRate} = Rs {(gridUnits * unitRate).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Frequency Chart */}
      <div className="card-premium p-6">
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg">Grid Frequency (24h)</h3>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={gridData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" domain={[49.95, 50.05]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="frequency"
                  stroke="hsl(200 70% 50%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Grid Voltage Chart */}
      <div className="card-premium p-6">
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg">Grid Voltage (24h)</h3>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={gridData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" domain={[225, 235]} />
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
                  stroke="hsl(38 92% 50%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Import/Export Profile */}
      <div className="card-premium p-6">
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg">Grid Import/Export (24h)</h3>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gridData}>
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
                <Legend />
                <Bar dataKey="import" fill="hsl(280 60% 50%)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="export" fill="hsl(160 70% 45%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Grid Coordination Rules */}
      <div className="card-premium p-6">
        <h3 className="font-display font-bold text-lg mb-4">Grid Coordination Rules</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
            <Plug className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-sm">Frequency Regulation</p>
              <p className="text-xs text-muted-foreground">
                Automatically adjust renewable generation and battery discharge to maintain grid frequency within 49.5-50.5 Hz
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
            <Plug className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-sm">Voltage Support</p>
              <p className="text-xs text-muted-foreground">
                Provide reactive power support to maintain grid voltage at nominal levels (220-240V)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
            <Plug className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-sm">Demand Response</p>
              <p className="text-xs text-muted-foreground">
                Participate in grid demand response programs to reduce load during peak hours
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
            <Plug className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-sm">Fault Ride-Through</p>
              <p className="text-xs text-muted-foreground">
                Maintain connection and provide support during grid disturbances
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Campus Map Link */}
      <button
        onClick={() => setShowMap(true)}
        className="card-premium p-6 w-full text-left hover:shadow-lg transition-shadow"
      >
        <div className="flex items-start gap-4">
          <MapPin className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-display font-bold">View Campus Energy Map</h3>
            <p className="text-sm text-muted-foreground">
              See real-time energy consumption across all campus buildings with interactive node details.
            </p>
          </div>
        </div>
      </button>

      {/* Grid Status Alert */}
      <div className="card-premium p-6 border-l-4 border-l-green-600 bg-green-50 dark:bg-green-950">
        <div className="flex items-start gap-4">
          <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0" />
          <div className="space-y-2">
            <h3 className="font-display font-bold">Grid Status: Optimal</h3>
            <p className="text-sm text-muted-foreground">
              Grid is stable and operating within all normal parameters. Campus is operating efficiently with minimal grid dependency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
