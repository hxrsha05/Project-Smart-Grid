export type PowerAdjustments = {
  solarDelta: number;
  windDelta: number;
};

export const POWER_ADJUSTMENTS_STORAGE_KEY = "smartgrid-power-adjustments";
export const POWER_ADJUSTMENTS_EVENT = "smartgrid-power-adjustments-change";

export const SENSOR_BASE_POWER = {
  solar: 950,
  wind: 280,
} as const;

const DEFAULT_POWER_ADJUSTMENTS: PowerAdjustments = {
  solarDelta: 0,
  windDelta: 0,
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
    })
  );

  window.dispatchEvent(new Event(POWER_ADJUSTMENTS_EVENT));
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
