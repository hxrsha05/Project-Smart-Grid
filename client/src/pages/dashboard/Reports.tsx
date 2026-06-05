import { useEffect, useMemo, useState } from "react";
import { Download, Calendar, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ReportData {
  date: string;
  solarGeneration: number;
  windGeneration: number;
  totalRenewable: number;
  gridImport: number;
  batteryCharged: number;
  batteryDischarged: number;
  totalConsumption: number;
  efficiency: number;
}

type CurrentWeather = {
  temperature: number;
  humidity: number;
  cloudCover: number;
  windSpeed: number;
  description: string;
  location: string;
  fetchedAt: number;
  source: "weatherapi" | "fallback";
};

type WeatherForecastItem = {
  timeLabel: string;
  temperature: number;
  humidity: number;
  cloudCover: number;
  windSpeed: number;
  rainChance: number;
  description: string;
};

type CurrentWeatherResponse = {
  ok: boolean;
  data: CurrentWeather;
};

type WeatherForecastResponse = {
  ok: boolean;
  data: WeatherForecastItem[];
};

type WeatherKind = "sunny" | "windy" | "rainy";

function classifyWeather(item: Pick<WeatherForecastItem, "description" | "windSpeed" | "rainChance">): WeatherKind {
  const description = item.description.toLowerCase();

  if (description.includes("rain") || item.rainChance >= 50) {
    return "rainy";
  }

  if (item.windSpeed >= 24 || description.includes("wind") || description.includes("storm")) {
    return "windy";
  }

  return "sunny";
}

function getPredictionGuidance(kind: WeatherKind) {
  switch (kind) {
    case "sunny":
      return {
        rule: "Rule 5",
        guidance: "Prioritize solar generation and charge the battery",
      };
    case "windy":
      return {
        rule: "Rule 6",
        guidance: "Prioritize wind generation and route excess to storage",
      };
    case "rainy":
      return {
        rule: "Resilience Mode",
        guidance: "Use battery support and grid energy together",
      };
  }
}

export default function Reports() {
  const [startDate, setStartDate] = useState("2026-05-20");
  const [endDate, setEndDate] = useState("2026-05-27");
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecastItem[]>([]);
  const [reportData] = useState<ReportData[]>([
    {
      date: "2026-05-20",
      solarGeneration: 8500,
      windGeneration: 3200,
      totalRenewable: 11700,
      gridImport: 5400,
      batteryCharged: 2100,
      batteryDischarged: 1800,
      totalConsumption: 17100,
      efficiency: 68,
    },
    {
      date: "2026-05-21",
      solarGeneration: 9200,
      windGeneration: 2800,
      totalRenewable: 12000,
      gridImport: 5100,
      batteryCharged: 2400,
      batteryDischarged: 1600,
      totalConsumption: 17100,
      efficiency: 70,
    },
    {
      date: "2026-05-22",
      solarGeneration: 7800,
      windGeneration: 4100,
      totalRenewable: 11900,
      gridImport: 5200,
      batteryCharged: 2200,
      batteryDischarged: 1900,
      totalConsumption: 17100,
      efficiency: 70,
    },
    {
      date: "2026-05-23",
      solarGeneration: 8900,
      windGeneration: 3500,
      totalRenewable: 12400,
      gridImport: 4800,
      batteryCharged: 2600,
      batteryDischarged: 1500,
      totalConsumption: 17100,
      efficiency: 73,
    },
    {
      date: "2026-05-24",
      solarGeneration: 9500,
      windGeneration: 2900,
      totalRenewable: 12400,
      gridImport: 4800,
      batteryCharged: 2600,
      batteryDischarged: 1400,
      totalConsumption: 17100,
      efficiency: 73,
    },
    {
      date: "2026-05-25",
      solarGeneration: 8200,
      windGeneration: 3800,
      totalRenewable: 12000,
      gridImport: 5100,
      batteryCharged: 2300,
      batteryDischarged: 1700,
      totalConsumption: 17100,
      efficiency: 70,
    },
    {
      date: "2026-05-26",
      solarGeneration: 9100,
      windGeneration: 3200,
      totalRenewable: 12300,
      gridImport: 4900,
      batteryCharged: 2500,
      batteryDischarged: 1600,
      totalConsumption: 17100,
      efficiency: 72,
    },
    {
      date: "2026-05-27",
      solarGeneration: 8700,
      windGeneration: 3400,
      totalRenewable: 12100,
      gridImport: 5000,
      batteryCharged: 2200,
      batteryDischarged: 1800,
      totalConsumption: 17100,
      efficiency: 71,
    },
  ]);

  useEffect(() => {
    let active = true;

    const loadWeather = async () => {
      try {
        const [currentResponse, forecastResponse] = await Promise.all([
          fetch("/api/weather/current", { credentials: "include" }),
          fetch("/api/weather/forecast", { credentials: "include" }),
        ]);

        if (!currentResponse.ok || !forecastResponse.ok) {
          throw new Error("Weather API unavailable");
        }

        const [currentPayload, forecastPayload] = (await Promise.all([
          currentResponse.json(),
          forecastResponse.json(),
        ])) as [CurrentWeatherResponse, WeatherForecastResponse];

        if (!active) return;
        setCurrentWeather(currentPayload.data ?? null);
        setWeatherForecast(forecastPayload.data ?? []);
      } catch {
        if (!active) return;
        setCurrentWeather(null);
        setWeatherForecast([]);
      }
    };

    loadWeather();
    const interval = window.setInterval(loadWeather, 5 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const liveWeatherRows = useMemo(() => {
    if (weatherForecast.length > 0) {
      return weatherForecast;
    }

    if (currentWeather) {
      return Array.from({ length: reportData.length }, () => ({
        timeLabel: currentWeather.location || "Current",
        temperature: currentWeather.temperature,
        humidity: currentWeather.humidity,
        cloudCover: currentWeather.cloudCover,
        description: currentWeather.description,
      }));
    }

    return [];
  }, [currentWeather, reportData.length, weatherForecast]);

  const handleExportCSV = () => {
    const filteredData = reportData.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
    });

    if (filteredData.length === 0) {
      toast.error("No data available for selected date range");
      return;
    }

    const headers = [
      "Date",
      "Solar Generation (kWh)",
      "Wind Generation (kWh)",
      "Total Renewable (kWh)",
      "Grid Import (kWh)",
      "Battery Charged (kWh)",
      "Battery Discharged (kWh)",
      "Total Consumption (kWh)",
      "Efficiency (%)",
      "Weather Time",
      "Temperature (°C)",
      "Humidity (%)",
      "Cloud Cover (%)",
      "Wind Speed (kph)",
      "Rain Chance (%)",
      "Weather Description",
      "Predicted Weather",
      "Decision Rule",
      "Prediction Guidance",
    ];

    const rows = filteredData.map((item, index) => {
      const liveWeather = liveWeatherRows.length > 0 ? liveWeatherRows[index % liveWeatherRows.length] : null;
      const predictedWeather = liveWeather
        ? classifyWeather({
            description: liveWeather.description,
            windSpeed: liveWeather.windSpeed ?? 0,
            rainChance: liveWeather.rainChance ?? 0,
          })
        : null;
      const predictionGuidance = predictedWeather ? getPredictionGuidance(predictedWeather) : null;

      return [
      item.date,
      item.solarGeneration,
      item.windGeneration,
      item.totalRenewable,
      item.gridImport,
      item.batteryCharged,
      item.batteryDischarged,
      item.totalConsumption,
      item.efficiency,
      liveWeather?.timeLabel ?? "N/A",
      liveWeather?.temperature ?? "N/A",
      liveWeather?.humidity ?? "N/A",
      liveWeather?.cloudCover ?? "N/A",
      liveWeather?.windSpeed ?? "N/A",
      liveWeather?.rainChance ?? "N/A",
      liveWeather?.description ?? "N/A",
      predictedWeather ? predictedWeather.toUpperCase() : "N/A",
      predictionGuidance?.rule ?? "N/A",
      predictionGuidance?.guidance ?? "N/A",
    ];
    });

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartgrid-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success("Report exported successfully");
  };

  const filteredData = reportData.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
  });

  const calculateSummary = () => {
    if (filteredData.length === 0) return null;

    return {
      totalSolar: filteredData.reduce((sum, item) => sum + item.solarGeneration, 0),
      totalWind: filteredData.reduce((sum, item) => sum + item.windGeneration, 0),
      totalRenewable: filteredData.reduce((sum, item) => sum + item.totalRenewable, 0),
      totalGridImport: filteredData.reduce((sum, item) => sum + item.gridImport, 0),
      totalConsumption: filteredData.reduce((sum, item) => sum + item.totalConsumption, 0),
      avgEfficiency: Math.round(
        filteredData.reduce((sum, item) => sum + item.efficiency, 0) / filteredData.length
      ),
      renewablePercentage: Math.round(
        (filteredData.reduce((sum, item) => sum + item.totalRenewable, 0) /
          filteredData.reduce((sum, item) => sum + item.totalConsumption, 0)) *
          100
      ),
    };
  };

  const summary = calculateSummary();

  return (
    <div className="space-y-8">
      {/* Date Range Selector */}
      <div className="card-premium p-6">
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg">Report Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button onClick={handleExportCSV} className="w-full justify-start gap-2">
                <Download className="w-4 h-4" />
                Export as CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-premium p-6">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Total Renewable Generation</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold">
                  {summary.totalRenewable.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">kWh</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Solar: {summary.totalSolar.toLocaleString()} kWh | Wind: {summary.totalWind.toLocaleString()} kWh
              </p>
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Renewable Percentage</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold">{summary.renewablePercentage}</span>
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Grid import: {summary.totalGridImport.toLocaleString()} kWh
              </p>
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Average Efficiency</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold">{summary.avgEfficiency}</span>
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Total consumption: {summary.totalConsumption.toLocaleString()} kWh
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="card-premium p-6 overflow-x-auto">
        <h3 className="font-display font-bold text-lg mb-4">Daily Summary</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Solar (kWh)</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Wind (kWh)</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Renewable (kWh)</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Grid (kWh)</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Consumption (kWh)</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Efficiency (%)</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.date} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4">{item.date}</td>
                <td className="text-right py-3 px-4">{item.solarGeneration.toLocaleString()}</td>
                <td className="text-right py-3 px-4">{item.windGeneration.toLocaleString()}</td>
                <td className="text-right py-3 px-4 font-medium">{item.totalRenewable.toLocaleString()}</td>
                <td className="text-right py-3 px-4">{item.gridImport.toLocaleString()}</td>
                <td className="text-right py-3 px-4">{item.totalConsumption.toLocaleString()}</td>
                <td className="text-right py-3 px-4">
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-xs font-medium">
                    {item.efficiency}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Report Info */}
      <div className="card-premium p-6 bg-muted/30">
        <div className="flex items-start gap-4">
          <BarChart3 className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-display font-bold">Report Generation</h3>
            <p className="text-sm text-muted-foreground">
              Generate comprehensive reports for any date range. Export data as CSV for further analysis in spreadsheet applications. Reports include daily summaries of renewable generation, grid usage, battery operations, system efficiency metrics, and live weather context from the attached weather API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
