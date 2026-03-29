import HousingUnitModel, { HousingUnit } from '../../models/HousingUnit';
import { Client } from '../../models/Client';

interface MatchScore {
  unitId: string;
  totalScore: number;
  breakdown: {
    location: number;
    budget: number;
    householdSize: number;
    languageCultural: number;
    accessibility: number;
    servicesProximity: number;
  };
}

// Default weights — org-configurable in settings.matching_weights
const DEFAULT_WEIGHTS = {
  location: 0.25,
  budget: 0.25,
  householdSize: 0.2,
  languageCultural: 0.15,
  accessibility: 0.1,
  servicesProximity: 0.05,
};

export const PlacementMatchingService = {
  /**
   * Score a single client against a single unit.
   */
  scoreClientUnit(
    client: Client,
    unit: HousingUnit,
    weights = DEFAULT_WEIGHTS,
  ): MatchScore {
    const breakdown = {
      location: this.scoreLocation(client, unit),
      budget: this.scoreBudget(client, unit),
      householdSize: this.scoreHouseholdSize(client, unit),
      languageCultural: this.scoreLanguageCultural(client, unit),
      accessibility: this.scoreAccessibility(client, unit),
      servicesProximity: this.scoreServicesProximity(client, unit),
    };

    const totalScore =
      breakdown.location * weights.location +
      breakdown.budget * weights.budget +
      breakdown.householdSize * weights.householdSize +
      breakdown.languageCultural * weights.languageCultural +
      breakdown.accessibility * weights.accessibility +
      breakdown.servicesProximity * weights.servicesProximity;

    return {
      unitId: unit.id,
      totalScore: Math.round(totalScore * 100) / 100,
      breakdown,
    };
  },

  /**
   * Find top N matching units for a client from available inventory.
   */
  async findTopMatches(
    orgId: string,
    client: Client,
    topN: number = 3,
    weights = DEFAULT_WEIGHTS,
  ): Promise<MatchScore[]> {
    const availableUnits = await HousingUnitModel.findAvailable(orgId);
    const scores = availableUnits.map((unit) =>
      this.scoreClientUnit(client, unit, weights),
    );
    scores.sort((a, b) => b.totalScore - a.totalScore);
    return scores.slice(0, topN);
  },

  // --- Scoring functions (0.0 to 1.0) ---

  scoreBudget(client: Client, unit: HousingUnit): number {
    if (!client.budget_max) return 0.5;
    if (unit.rent_amount <= client.budget_max) return 1.0;
    const overBudgetPct =
      (unit.rent_amount - client.budget_max) / client.budget_max;
    if (overBudgetPct <= 0.1) return 0.7;
    if (overBudgetPct <= 0.2) return 0.4;
    return 0.1;
  },

  scoreHouseholdSize(client: Client, unit: HousingUnit): number {
    const needed = Math.ceil(client.household_size / 2);
    if (unit.bedrooms >= needed) return 1.0;
    if (unit.bedrooms === needed - 1) return 0.5;
    return 0.1;
  },

  scoreLocation(client: Client, unit: HousingUnit): number {
    if (!client.preferred_area) return 0.5;
    if (!unit.city) return 0.3;
    if (client.preferred_area.toLowerCase().includes(unit.city.toLowerCase()))
      return 1.0;
    return 0.3;
  },

  scoreLanguageCultural(client: Client, unit: HousingUnit): number {
    if (!client.language_primary || !unit.language_spoken) return 0.5;
    if (
      client.language_primary.toLowerCase() ===
      unit.language_spoken.toLowerCase()
    )
      return 1.0;
    return 0.3;
  },

  scoreAccessibility(client: Client, unit: HousingUnit): number {
    const needs = client.accessibility_needs || {};
    const features = unit.accessibility_features || [];
    const needKeys = Object.keys(needs).filter(
      (k) => (needs as Record<string, boolean>)[k] === true,
    );
    if (needKeys.length === 0) return 1.0;
    if (features.length === 0 && needKeys.length > 0) return 0.1;
    const matched = needKeys.filter((need) =>
      features.some((f: string) =>
        f.toLowerCase().includes(need.toLowerCase()),
      ),
    );
    return matched.length / needKeys.length;
  },

  scoreServicesProximity(client: Client, unit: HousingUnit): number {
    const services = unit.nearby_services || {};
    const serviceCount = Object.keys(services).length;
    if (serviceCount >= 4) return 1.0;
    if (serviceCount >= 2) return 0.7;
    if (serviceCount >= 1) return 0.4;
    return 0.2;
  },
};
