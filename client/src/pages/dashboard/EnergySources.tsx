import { useState, useEffect } from "react";
import { Zap, Wind, Cloud, Droplets } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  SENSOR_BASE_POWER,
  getAdjustedPower,
  readPowerAdjustments,
  subscribePowerAdjustments,
  writePowerAdjustments,
} from "@/lib/powerAdjustments";

interface WeatherData {
  time: string;
  solarIrradiance: number;
  windSpeed: number;
  temperature: number;
  humidity: number;
}

type CurrentWeather = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  cloudCover: number;
  windSpeed: number;
  description: string;
  location: string;
  fetchedAt: number;
  source: "weatherapi" | "fallback";
};

type CurrentWeatherResponse = {
  ok: boolean;
  data: CurrentWeather;
};

type WeatherForecastItem = {
  timeLabel: string;
  temperature: number;
  humidity: number;
  cloudCover: number;
  description: string;
};

type WeatherForecastResponse = {
  ok: boolean;
  data: WeatherForecastItem[];
};

const buildFallbackForecast = (): WeatherForecastItem[] =>
  Array.from({ length: 24 }, (_, index) => ({
    timeLabel: `${String(index).padStart(2, "0")}:00`,
    temperature: 24 - Math.min(6, Math.floor(index / 4)),
    humidity: 60 + (index % 6),
    cloudCover: 15 + (index % 5) * 4,
    description: index < 6 ? "Patchy rain nearby" : index < 12 ? "Partly cloudy" : index < 18 ? "Clear" : "Mist",
  }));

const DEFAULT_CURRENT_WEATHER: CurrentWeather = {
  temperature: 24,
  feelsLike: 24,
  humidity: 62,
  cloudCover: 15,
  windSpeed: 14,
  description: "Mostly clear",
  location: "Campus",
  fetchedAt: Date.now(),
  source: "fallback",
};

const DEFAULT_FORECAST: WeatherForecastItem[] = buildFallbackForecast();

const SOLAR_ADJUSTMENT_RANGE = 2000;
const WIND_ADJUSTMENT_RANGE = 1000;

export default function EnergySources() {
  const [loading, setLoading] = useState(true);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather>(DEFAULT_CURRENT_WEATHER);
  const [forecast, setForecast] = useState<WeatherForecastItem[]>(DEFAULT_FORECAST);
  const [powerAdjustments, setPowerAdjustments] = useState(readPowerAdjustments());

  const weatherData = forecast.slice(0, 7).map((item, index) => ({
    time: item.timeLabel,
    solarIrradiance: Math.max(0, (100 - item.cloudCover) * 10),
    windSpeed: currentWeather.windSpeed + index * 0.5,
    temperature: item.temperature,
    humidity: item.humidity,
  }));

  useEffect(() => {
    return subscribePowerAdjustments(setPowerAdjustments);
  }, []);

  useEffect(() => {
    let active = true;

    const loadForecast = async () => {
      try {
        const response = await fetch("/api/weather/forecast", { credentials: "include" });
        if (!response.ok) {
          throw new Error(`Forecast unavailable (${response.status})`);
        }
        const payload = (await response.json()) as WeatherForecastResponse;
        if (!active) return;
        setForecast(payload.data?.length ? payload.data.slice(0, 24) : DEFAULT_FORECAST);
      } catch {
        if (!active) return;
        setForecast(DEFAULT_FORECAST);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadForecast();
    const interval = window.setInterval(loadForecast, 10 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const windSpeedDisplay = weatherData.length
    ? weatherData[weatherData.length - 1]?.windSpeed ?? 14
    : 14;

  const solarPower = getAdjustedPower(SENSOR_BASE_POWER.solar, powerAdjustments.solarDelta);
  const windPower = getAdjustedPower(SENSOR_BASE_POWER.wind, powerAdjustments.windDelta);

  const formatAdjustment = (value: number) => {
    if (value === 0) return "0 kW adjust";
    return `${value > 0 ? "+" : ""}${value} kW adjust`;
  };

  const formatSensorLabel = (basePower: number, delta: number) => {
    if (delta === 0) {
      return `Sensor ${basePower} kW`;
    }

    return `Sensor ${basePower} kW · ${formatAdjustment(delta)}`;
  };

  useEffect(() => {
    let active = true;

    const loadCurrentWeather = async () => {
      try {
        const response = await fetch("/api/weather/current", { credentials: "include" });
        if (!response.ok) {
          throw new Error(`Weather unavailable (${response.status})`);
        }
        const payload = (await response.json()) as CurrentWeatherResponse;
        if (!active || !payload?.data) return;
        setCurrentWeather(payload.data);
      } catch {
        if (!active) return;
        setCurrentWeather(DEFAULT_CURRENT_WEATHER);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCurrentWeather();
    const interval = window.setInterval(loadCurrentWeather, 5 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Energy Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Solar */}
        <div className="card-premium p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Solar Generation</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold">{solarPower}</span>
                <span className="text-sm text-muted-foreground">kW</span>
              </div>
              <p className="text-xs text-muted-foreground">{formatSensorLabel(SENSOR_BASE_POWER.solar, powerAdjustments.solarDelta)}</p>
            </div>
              <div className="w-12 h-12 bg-[hsl(38_92%_50%)] rounded-lg flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Efficiency</span>
              <span className="font-medium">79%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-[hsl(38_92%_50%)] w-[79%]" />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Adjust Solar Power</span>
              <span className="font-medium">{formatAdjustment(powerAdjustments.solarDelta)}</span>
            </div>
            <Slider
              value={[powerAdjustments.solarDelta]}
              min={-SOLAR_ADJUSTMENT_RANGE}
              max={SOLAR_ADJUSTMENT_RANGE}
              step={10}
              onValueChange={([value]) =>
                writePowerAdjustments({
                  ...powerAdjustments,
                  solarDelta: value ?? 0,
                })
              }
              className="h-6 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-muted [&_[data-slot=slider-range]]:bg-[hsl(38_92%_50%)] [&_[data-slot=slider-thumb]]:border-[hsl(38_92%_50%)]"
            />
          </div>
        </div>

        {/* Wind */}
        <div className="card-premium p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Wind Generation</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold">{windPower}</span>
                <span className="text-sm text-muted-foreground">kW</span>
              </div>
              <p className="text-xs text-muted-foreground">{formatSensorLabel(SENSOR_BASE_POWER.wind, powerAdjustments.windDelta)}</p>
            </div>
            <div className="w-12 h-12 bg-[hsl(200_70%_50%)] rounded-lg flex items-center justify-center">
              <Wind className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Wind Speed</span>
              <span className="font-medium">{windSpeedDisplay.toFixed(1)} m/s</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-[hsl(200_70%_50%)]"
                style={{ width: `${Math.min(100, windSpeedDisplay * 7)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Adjust Wind Power</span>
              <span className="font-medium">{formatAdjustment(powerAdjustments.windDelta)}</span>
            </div>
            <Slider
              value={[powerAdjustments.windDelta]}
              min={-WIND_ADJUSTMENT_RANGE}
              max={WIND_ADJUSTMENT_RANGE}
              step={5}
              onValueChange={([value]) =>
                writePowerAdjustments({
                  ...powerAdjustments,
                  windDelta: value ?? 0,
                })
              }
              className="h-6 [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-muted [&_[data-slot=slider-range]]:bg-[hsl(200_70%_50%)] [&_[data-slot=slider-thumb]]:border-[hsl(200_70%_50%)]"
            />
          </div>
        </div>
      </div>

      {/* Weather Conditions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-premium p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <Cloud className="w-6 h-6 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Cloud Cover</p>
              <p className="font-display font-bold text-lg">{Math.round(currentWeather.cloudCover)}%</p>
              <p className="text-xs text-muted-foreground">{currentWeather.description}</p>
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Temperature</p>
              <p className="font-display font-bold text-lg">{Math.round(currentWeather.temperature)}°C</p>
              <p className="text-xs text-muted-foreground">Feels like {Math.round(currentWeather.feelsLike)}°C</p>
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <Droplets className="w-6 h-6 text-cyan-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Humidity</p>
              <p className="font-display font-bold text-lg">{Math.round(currentWeather.humidity)}%</p>
              <p className="text-xs text-muted-foreground">Moderate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Solar Irradiance Chart */}
      <div className="card-premium p-6">
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg">Solar Irradiance (24h)</h3>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weatherData}>
                <defs>
                  <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
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
                  dataKey="solarIrradiance"
                  stroke="hsl(38 92% 50%)"
                  fillOpacity={1}
                  fill="url(#colorSolar)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Wind Speed Chart */}
      <div className="card-premium p-6">
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg">Wind Speed (24h)</h3>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weatherData}>
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
                  dataKey="windSpeed"
                  stroke="hsl(200 70% 50%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Temperature Chart */}
      <div className="card-premium p-6">
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg">Temperature (24h)</h3>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weatherData}>
                <defs>
                  <linearGradient id="colorTemperature" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(24 95% 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(24 95% 53%)" stopOpacity={0} />
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
                  dataKey="temperature"
                  stroke="hsl(24 95% 53%)"
                  fillOpacity={1}
                  fill="url(#colorTemperature)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Humidity Chart */}
      <div className="card-premium p-6">
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg">Humidity (24h)</h3>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weatherData}>
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
                  dataKey="humidity"
                  stroke="hsl(190 85% 45%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Forecast */}
      <div className="card-premium p-6">
        <h3 className="font-display font-bold text-lg mb-4">24-Hour Forecast</h3>
        <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
          {forecast.map((item) => (
            <div key={item.timeLabel} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">{item.timeLabel}</p>
                <p className="text-xs text-muted-foreground capitalize">{item.description}</p>
              </div>
              <span className="text-sm font-medium">
                {Math.round(item.temperature)}°C · {Math.round(item.humidity)}% RH
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
