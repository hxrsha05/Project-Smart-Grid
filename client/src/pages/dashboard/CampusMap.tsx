import { useState, useEffect } from "react";
import { MapPin, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BuildingNode {
  id: string;
  name: string;
  x: number;
  y: number;
  consumption: number;
  maxCapacity: number;
  status: "normal" | "warning" | "critical";
  temperature: number;
}

export default function CampusMap() {
  const [buildings, setBuildings] = useState<BuildingNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingNode | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBuildings([
        {
          id: "b1",
          name: "Science Building",
          x: 20,
          y: 30,
          consumption: 450,
          maxCapacity: 600,
          status: "normal",
          temperature: 22,
        },
        {
          id: "b2",
          name: "Engineering Lab",
          x: 60,
          y: 25,
          consumption: 680,
          maxCapacity: 800,
          status: "normal",
          temperature: 24,
        },
        {
          id: "b3",
          name: "Library",
          x: 40,
          y: 60,
          consumption: 320,
          maxCapacity: 500,
          status: "normal",
          temperature: 21,
        },
        {
          id: "b4",
          name: "Student Center",
          x: 75,
          y: 65,
          consumption: 550,
          maxCapacity: 700,
          status: "warning",
          temperature: 25,
        },
        {
          id: "b5",
          name: "Admin Building",
          x: 35,
          y: 80,
          consumption: 280,
          maxCapacity: 400,
          status: "normal",
          temperature: 20,
        },
        {
          id: "b6",
          name: "Data Center",
          x: 70,
          y: 50,
          consumption: 920,
          maxCapacity: 1000,
          status: "warning",
          temperature: 28,
        },
      ]);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string, intensity: number) => {
    if (status === "critical") return "hsl(0 84% 60%)";
    if (status === "warning") return "hsl(38 92% 50%)";
    if (intensity > 0.8) return "hsl(38 92% 50%)";
    if (intensity > 0.6) return "hsl(200 70% 50%)";
    return "hsl(160 70% 45%)";
  };

  const getIntensity = (consumption: number, maxCapacity: number) => {
    return consumption / maxCapacity;
  };

  return (
    <div className="space-y-8">
      {/* Map Container */}
      <div className="card-premium p-6">
        <h3 className="font-display font-bold text-lg mb-4">Campus Energy Map</h3>
        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="relative w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Grid background */}
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.05" opacity="0.1" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />

              {/* Buildings */}
              {buildings.map((building) => {
                const intensity = getIntensity(building.consumption, building.maxCapacity);
                const color = getStatusColor(building.status, intensity);
                const size = 8 + intensity * 4;

                return (
                  <g key={building.id}>
                    {/* Building node */}
                    <circle
                      cx={building.x}
                      cy={building.y}
                      r={size}
                      fill={color}
                      opacity="0.8"
                      className="cursor-pointer transition-all hover:opacity-100"
                      onClick={() => setSelectedBuilding(building)}
                      style={{
                        filter: `drop-shadow(0 0 ${size * 0.5}px ${color})`,
                      }}
                    />
                    {/* Building label */}
                    <text
                      x={building.x}
                      y={building.y + size + 8}
                      textAnchor="middle"
                      className="text-xs font-medium fill-foreground pointer-events-none"
                      fontSize="3"
                    >
                      {building.name.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(160 70% 45%)" }} />
                <span>Low (0-60%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(200 70% 50%)" }} />
                <span>Medium (60-80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(38 92% 50%)" }} />
                <span>High (80%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(0 84% 60%)" }} />
                <span>Critical</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Building Details */}
      {selectedBuilding && (
        <div className="card-premium p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-bold text-lg">{selectedBuilding.name}</h3>
                <p className="text-sm text-muted-foreground">Building ID: {selectedBuilding.id}</p>
              </div>
              <button
                onClick={() => setSelectedBuilding(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Current Consumption</p>
                <p className="text-2xl font-display font-bold">{selectedBuilding.consumption}</p>
                <p className="text-xs text-muted-foreground">kW</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Capacity Utilization</p>
                <p className="text-2xl font-display font-bold">
                  {Math.round((getIntensity(selectedBuilding.consumption, selectedBuilding.maxCapacity) * 100))}%
                </p>
                <p className="text-xs text-muted-foreground">of {selectedBuilding.maxCapacity} kW</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Temperature</p>
                <p className="text-2xl font-display font-bold">{selectedBuilding.temperature}</p>
                <p className="text-xs text-muted-foreground">°C</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-2xl font-display font-bold capitalize">{selectedBuilding.status}</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Load Profile</span>
                <span className="font-medium">
                  {Math.round((getIntensity(selectedBuilding.consumption, selectedBuilding.maxCapacity) * 100))}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.round((getIntensity(selectedBuilding.consumption, selectedBuilding.maxCapacity) * 100))}%`,
                    backgroundColor: getStatusColor(selectedBuilding.status, getIntensity(selectedBuilding.consumption, selectedBuilding.maxCapacity)),
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buildings Summary Table */}
      <div className="card-premium p-6 overflow-x-auto">
        <h3 className="font-display font-bold text-lg mb-4">All Buildings</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Building</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Consumption</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Capacity</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Utilization</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Temp</th>
              <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((building) => {
              const intensity = getIntensity(building.consumption, building.maxCapacity);
              return (
                <tr
                  key={building.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedBuilding(building)}
                >
                  <td className="py-3 px-4 font-medium">{building.name}</td>
                  <td className="text-right py-3 px-4">{building.consumption} kW</td>
                  <td className="text-right py-3 px-4">{building.maxCapacity} kW</td>
                  <td className="text-right py-3 px-4">{Math.round(intensity * 100)}%</td>
                  <td className="text-right py-3 px-4">{building.temperature}°C</td>
                  <td className="text-center py-3 px-4">
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-medium capitalize"
                      style={{
                        backgroundColor: getStatusColor(building.status, intensity),
                        color: "white",
                      }}
                    >
                      {building.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Map Info */}
      <div className="card-premium p-6 bg-muted/30">
        <div className="flex items-start gap-4">
          <MapPin className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-display font-bold">Campus Energy Distribution</h3>
            <p className="text-sm text-muted-foreground">
              Monitor real-time energy consumption across all campus buildings. Node size and color indicate current load intensity. Click on any building to view detailed metrics and operational status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
