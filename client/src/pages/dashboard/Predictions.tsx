import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertCircle, CloudRain, CloudSun, RefreshCw, Wind } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ForecastItem {
  timeLabel: string;
  temperature: number;
  humidity: number;
  cloudCover: number;
  windSpeed: number;
  rainChance: number;
  description: string;
}

type WeatherKind = "sunny" | "windy" | "rainy";

type ForecastResponse = {
  ok: boolean;
  data: ForecastItem[];
};

interface PredictedBlock {
  kind: WeatherKind;
  title: string;
  rule: string;
  recommendation: string;
  hours: number;
  confidence: number;
  colorClass: string;
  svgColor: string;
}

const KIND_META: Record<WeatherKind, { icon: React.ReactNode; label: string; colorClass: string; svgColor: string }> = {
  sunny: {
    icon: <CloudSun className="h-5 w-5" />,
    label: "Sunny",
    colorClass: "bg-amber-500",
    svgColor: "#f59e0b",
  },
  windy: {
    icon: <Wind className="h-5 w-5" />,
    label: "Windy",
    colorClass: "bg-sky-500",
    svgColor: "#0ea5e9",
  },
  rainy: {
    icon: <CloudRain className="h-5 w-5" />,
    label: "Rainy",
    colorClass: "bg-cyan-600",
    svgColor: "#0891b2",
  },
};

function classifyWeather(item: ForecastItem): WeatherKind {
  const description = item.description.toLowerCase();
  if (description.includes("rain") || item.rainChance >= 50) {
    return "rainy";
  }

  if (item.windSpeed >= 24 || description.includes("wind") || description.includes("storm")) {
    return "windy";
  }

  return "sunny";
}

function buildRecommendation(kind: WeatherKind) {
  switch (kind) {
    case "sunny":
      return {
        rule: "Rule 5",
        recommendation: "Prioritize solar generation, charge the battery, and defer flexible loads.",
      };
    case "windy":
      return {
        rule: "Rule 6",
        recommendation: "Prioritize wind capture and route excess energy into storage.",
      };
    case "rainy":
      return {
        rule: "Resilience Mode",
        recommendation: "Renewables may be weak. Rely on battery support and grid energy together.",
      };
  }
}

function scoreRenewablePotential(item: ForecastItem) {
  const sunnyBoost = Math.max(0, 100 - item.cloudCover) * 0.65;
  const windBoost = item.windSpeed * 1.2;
  const rainPenalty = item.rainChance * 0.7;
  return Math.max(0, Math.round(20 + sunnyBoost + windBoost - rainPenalty));
}

export default function Predictions() {
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLabel, setLocationLabel] = useState("Campus");

  useEffect(() => {
    let active = true;

    const loadForecast = async () => {
      try {
        const response = await fetch("/api/weather/forecast?day=1", { credentials: "include" });
        if (!response.ok) {
          throw new Error(`Forecast unavailable (${response.status})`);
        }

        const payload = (await response.json()) as ForecastResponse;
        if (!active) return;
        setForecast(payload.data ?? []);
      } catch {
        if (!active) return;
        setForecast([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadForecast();
    const interval = window.setInterval(loadForecast, 10 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const predictedBlocks = useMemo<PredictedBlock[]>(() => {
    const counts: Record<WeatherKind, number> = { sunny: 0, windy: 0, rainy: 0 };
    const grouped: ForecastItem[] = forecast.slice(0, 24);

    for (const item of grouped) {
      counts[classifyWeather(item)] += 1;
    }

    return (Object.keys(counts) as WeatherKind[]).map((kind) => {
      const hours = counts[kind];
      const confidence = grouped.length ? Math.round((hours / grouped.length) * 100) : 0;
      const meta = KIND_META[kind];
      const recommendation = buildRecommendation(kind);

      const title =
        kind === "sunny"
          ? "Solar-first day"
          : kind === "windy"
            ? "Wind-support day"
            : "Battery + grid support day";

      return {
        kind,
        title,
        rule: recommendation.rule,
        recommendation: recommendation.recommendation,
        hours,
        confidence,
        colorClass: meta.colorClass,
        svgColor: meta.svgColor,
      };
    });
  }, [forecast]);

  const dominantBlock = predictedBlocks.reduce<PredictedBlock | null>((best, current) => {
    if (!best || current.hours > best.hours) return current;
    return best;
  }, null);

  const chartData = forecast.slice(0, 24).map((item) => ({
    time: item.timeLabel,
    temperature: item.temperature,
    windSpeed: item.windSpeed,
    rainChance: item.rainChance,
    renewablePotential: scoreRenewablePotential(item),
    condition: classifyWeather(item),
  }));

  const conditionPie = predictedBlocks.map((block) => ({
    name: KIND_META[block.kind].label,
    value: block.hours,
    svgColor: KIND_META[block.kind].svgColor,
  }));

  return (
    <div className="space-y-8">
      <div className="card-premium p-6 border-l-4 border-l-sky-500 bg-sky-50/60 dark:bg-sky-950/40">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 max-w-3xl">
            <p className="text-sm text-muted-foreground">Weather Predictions</p>
            <h2 className="font-display font-bold text-2xl">Tomorrow's weather mapped to energy strategy</h2>
            <p className="text-sm text-muted-foreground">
              This page uses the attached WeatherAPI forecast to classify the next day into sunny, windy, and rainy patterns,
              then recommends the right grid, battery, and renewable strategy.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {predictedBlocks.map((block) => {
            const meta = KIND_META[block.kind];
            return (
              <div key={block.kind} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${meta.colorClass} text-white flex items-center justify-center`}>
                      {meta.icon}
                    </div>
                    <div>
                      <p className="font-display font-bold">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{block.title}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{block.confidence}%</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Forecast hours</span>
                    <span>{block.hours} / 24</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${meta.colorClass}`} style={{ width: `${block.confidence}%` }} />
                  </div>
                </div>
                <div className="text-sm">
                  <span className="font-medium">{block.rule}: </span>
                  <span className="text-muted-foreground">{block.recommendation}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Recommended strategy</p>
            <p className="text-sm text-muted-foreground">
              {dominantBlock
                ? `${dominantBlock.rule} should be the default focus for the next day because ${KIND_META[dominantBlock.kind].label.toLowerCase()} conditions dominate the forecast.`
                : "Load the forecast to see the suggested next-day strategy."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Forecast Signals (24h)</h3>
            <span className="text-xs text-muted-foreground">Temperature, wind, rain chance, and renewable readiness</span>
          </div>
          {loading ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="renewablePotentialFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160 70% 45%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(160 70% 45%)" stopOpacity={0} />
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
                <Area type="monotone" dataKey="renewablePotential" stroke="hsl(160 70% 45%)" fill="url(#renewablePotentialFill)" />
                <Area type="monotone" dataKey="windSpeed" stroke="hsl(200 70% 50%)" fillOpacity={0} />
                <Area type="monotone" dataKey="rainChance" stroke="hsl(0 84% 60%)" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-premium p-6">
          <h3 className="font-display font-bold text-lg mb-4">Weather Split</h3>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={conditionPie} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                  {conditionPie.map((entry) => (
                    <Cell key={entry.name} fill={entry.svgColor} stroke="#ffffff" strokeWidth={2} />
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
          <div className="mt-4 space-y-2">
            {conditionPie.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.svgColor }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
                <span className="font-medium">{String(entry.value).padStart(2, "0")}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-premium p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg">Action Guidance</h3>
          <p className="text-xs text-muted-foreground">WeatherAPI backed recommendations</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border p-4 space-y-2 bg-amber-50/60 dark:bg-amber-950/30">
            <p className="font-medium">Sunny day</p>
            <p className="text-sm text-muted-foreground">Use Rule 5: solar optimization, charge battery, and shift flexible loads.</p>
          </div>
          <div className="rounded-xl border border-border p-4 space-y-2 bg-sky-50/60 dark:bg-sky-950/30">
            <p className="font-medium">Windy day</p>
            <p className="text-sm text-muted-foreground">Use Rule 6: prioritize wind power and maximize capture while conditions are strong.</p>
          </div>
          <div className="rounded-xl border border-border p-4 space-y-2 bg-cyan-50/60 dark:bg-cyan-950/30">
            <p className="font-medium">Rainy day</p>
            <p className="text-sm text-muted-foreground">Renewables may be weaker, so rely on battery support and grid energy together.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
