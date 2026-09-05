import type { StormScenario } from "@workspace/api-client-react";

export const DEFAULT_STORM_SCENARIO: StormScenario = "category_3";

export const STORM_SCENARIOS: Array<{
  value: StormScenario;
  shortLabel: string;
  label: string;
  intensityPenalty: number;
  recoveryMultiplier: number;
}> = [
  { value: "tropical_storm", shortLabel: "TS", label: "Tropical Storm", intensityPenalty: 0, recoveryMultiplier: 0.4 },
  { value: "category_1", shortLabel: "Cat 1", label: "Category 1", intensityPenalty: 1, recoveryMultiplier: 0.55 },
  { value: "category_2", shortLabel: "Cat 2", label: "Category 2", intensityPenalty: 3, recoveryMultiplier: 0.75 },
  { value: "category_3", shortLabel: "Cat 3", label: "Category 3", intensityPenalty: 5, recoveryMultiplier: 1 },
  { value: "category_4", shortLabel: "Cat 4", label: "Category 4", intensityPenalty: 10, recoveryMultiplier: 1.3 },
  { value: "category_5", shortLabel: "Cat 5", label: "Category 5", intensityPenalty: 15, recoveryMultiplier: 1.65 },
];

export function getStormScenario(scenario: StormScenario) {
  return STORM_SCENARIOS.find((option) => option.value === scenario) ?? STORM_SCENARIOS[3];
}