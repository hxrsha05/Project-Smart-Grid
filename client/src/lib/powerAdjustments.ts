export type PowerAdjustments = {
  solarDelta: number;
  windDelta: number;
  demandDelta: number;
};

export type BatterySocOverride = number | null;

export const POWER_ADJUSTMENTS_STORAGE_KEY = "smartgrid-power-adjustments";
export const POWER_ADJUSTMENTS_EVENT = "smartgrid-power-adjustments-change";
export const BATTERY_SOC_STORAGE_KEY = "smartgrid-battery-soc-override";
export const BATTERY_SOC_EVENT = "smartgrid-battery-soc-change";

export const SENSOR_BASE_POWER = {
  solar: 950,
  wind: 280,
} as const;

const DEFAULT_POWER_ADJUSTMENTS: PowerAdjustments = {
  solarDelta: 0,
  windDelta: 0,
  demandDelta: 0,
};

function normalizeNumber(value: unknown, fallback: number) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function readPowerAdjustments(): PowerAdjustments {
  if (typeof window === "undefined") {
    return DEFAULT_POWER_ADJUSTMENTS;
  }

  try {
    const rawValue = window.localStorage.getItem(POWER_ADJUSTMENTS_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_POWER_ADJUSTMENTS;
    }

    const parsed = JSON.parse(rawValue) as Partial<PowerAdjustments>;
    return {
      solarDelta: normalizeNumber(parsed.solarDelta, DEFAULT_POWER_ADJUSTMENTS.solarDelta),
      windDelta: normalizeNumber(parsed.windDelta, DEFAULT_POWER_ADJUSTMENTS.windDelta),
      demandDelta: normalizeNumber(parsed.demandDelta, DEFAULT_POWER_ADJUSTMENTS.demandDelta),
    };
  } catch {
    return DEFAULT_POWER_ADJUSTMENTS;
  }
}

export function writePowerAdjustments(adjustments: PowerAdjustments) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    POWER_ADJUSTMENTS_STORAGE_KEY,
    JSON.stringify({
      solarDelta: adjustments.solarDelta,
      windDelta: adjustments.windDelta,
      demandDelta: adjustments.demandDelta,
    })
  );

  window.dispatchEvent(new Event(POWER_ADJUSTMENTS_EVENT));
}

export function readBatterySocOverride(): BatterySocOverride {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(BATTERY_SOC_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as { batterySoc?: unknown };
    const batterySoc = normalizeNumber(parsed.batterySoc, Number.NaN);
    return Number.isFinite(batterySoc) ? Math.max(0, Math.min(100, batterySoc)) : null;
  } catch {
    return null;
  }
}

export function writeBatterySocOverride(batterySoc: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    BATTERY_SOC_STORAGE_KEY,
    JSON.stringify({ batterySoc: Math.max(0, Math.min(100, batterySoc)) })
  );

  window.dispatchEvent(new Event(BATTERY_SOC_EVENT));
}

export function subscribeBatterySoc(callback: (batterySoc: BatterySocOverride) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleUpdate = () => callback(readBatterySocOverride());
  const handleStorage = (event: StorageEvent) => {
    if (event.key === BATTERY_SOC_STORAGE_KEY) {
      handleUpdate();
    }
  };

  window.addEventListener(BATTERY_SOC_EVENT, handleUpdate);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(BATTERY_SOC_EVENT, handleUpdate);
    window.removeEventListener("storage", handleStorage);
  };
}

export function subscribePowerAdjustments(
  callback: (adjustments: PowerAdjustments) => void
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleUpdate = () => callback(readPowerAdjustments());
  const handleStorage = (event: StorageEvent) => {
    if (event.key === POWER_ADJUSTMENTS_STORAGE_KEY) {
      handleUpdate();
    }
  };

  window.addEventListener(POWER_ADJUSTMENTS_EVENT, handleUpdate);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(POWER_ADJUSTMENTS_EVENT, handleUpdate);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getAdjustedPower(basePower: number, delta: number) {
  return Math.max(0, basePower + delta);
}
