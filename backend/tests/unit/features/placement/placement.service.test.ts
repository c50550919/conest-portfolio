import { PlacementMatchingService } from '../../../../src/features/placement/placement.service';
import { Client } from '../../../../src/models/Client';
import { HousingUnit } from '../../../../src/models/HousingUnit';

const mockClient: Client = {
  id: 'client-1',
  org_id: 'org-1',
  first_name: 'Maria',
  last_name: 'Garcia',
  household_size: 4,
  income_range: '30000-45000',
  language_primary: 'Spanish',
  language_secondary: 'English',
  cultural_preferences: {},
  accessibility_needs: {},
  location_preference: null,
  preferred_area: 'Charlotte',
  budget_max: 1200,
  status: 'ready',
  case_manager_id: null,
  intake_date: '2026-03-01',
  notes_encrypted: null,
  phone: null,
  email: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockUnit: HousingUnit = {
  id: 'unit-1',
  org_id: 'org-1',
  address: '123 Main St',
  city: 'Charlotte',
  state: 'NC',
  zip: '28202',
  location: null,
  bedrooms: 3,
  bathrooms: 2,
  rent_amount: 1100,
  landlord_name: 'Smith Properties',
  landlord_contact: '704-555-0100',
  accessibility_features: [],
  language_spoken: 'Spanish',
  available_from: '2026-04-01',
  available_until: null,
  status: 'available',
  nearby_services: {
    transit: 'CATS bus stop 0.2mi',
    schools: 'Shamrock Gardens Elementary 0.5mi',
  },
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('PlacementMatchingService', () => {
  describe('scoreClientUnit', () => {
    it('should return a score between 0 and 1', () => {
      const result = PlacementMatchingService.scoreClientUnit(
        mockClient,
        mockUnit,
      );
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(1);
    });

    it('should have all breakdown components', () => {
      const result = PlacementMatchingService.scoreClientUnit(
        mockClient,
        mockUnit,
      );
      expect(result.breakdown).toHaveProperty('location');
      expect(result.breakdown).toHaveProperty('budget');
      expect(result.breakdown).toHaveProperty('householdSize');
      expect(result.breakdown).toHaveProperty('languageCultural');
      expect(result.breakdown).toHaveProperty('accessibility');
      expect(result.breakdown).toHaveProperty('servicesProximity');
    });

    it('should score high for a good match', () => {
      const result = PlacementMatchingService.scoreClientUnit(
        mockClient,
        mockUnit,
      );
      expect(result.totalScore).toBeGreaterThan(0.7);
    });

    it('should score low for over-budget unit', () => {
      const expensiveUnit = { ...mockUnit, rent_amount: 2000 };
      const result = PlacementMatchingService.scoreClientUnit(
        mockClient,
        expensiveUnit,
      );
      expect(result.breakdown.budget).toBeLessThan(0.5);
    });

    it('should score low for undersized unit', () => {
      const smallUnit = { ...mockUnit, bedrooms: 1 };
      const result = PlacementMatchingService.scoreClientUnit(
        mockClient,
        smallUnit,
      );
      // 1 bedroom vs needed 2 = one short = 0.5
      expect(result.breakdown.householdSize).toBeLessThanOrEqual(0.5);
    });
  });

  describe('scoreBudget', () => {
    it('should return 1.0 when unit is within budget', () => {
      expect(
        PlacementMatchingService.scoreBudget(mockClient, mockUnit),
      ).toBe(1.0);
    });

    it('should return 0.5 when client has no budget preference', () => {
      const noBudgetClient = { ...mockClient, budget_max: null };
      expect(
        PlacementMatchingService.scoreBudget(noBudgetClient, mockUnit),
      ).toBe(0.5);
    });

    it('should return 0.7 when slightly over budget (<=10%)', () => {
      const slightlyOverUnit = { ...mockUnit, rent_amount: 1300 };
      expect(
        PlacementMatchingService.scoreBudget(mockClient, slightlyOverUnit),
      ).toBe(0.7);
    });

    it('should return 0.4 when moderately over budget (<=20%)', () => {
      const moderatelyOverUnit = { ...mockUnit, rent_amount: 1400 };
      expect(
        PlacementMatchingService.scoreBudget(mockClient, moderatelyOverUnit),
      ).toBe(0.4);
    });

    it('should return 0.1 when significantly over budget (>20%)', () => {
      const wayOverUnit = { ...mockUnit, rent_amount: 2000 };
      expect(
        PlacementMatchingService.scoreBudget(mockClient, wayOverUnit),
      ).toBe(0.1);
    });
  });

  describe('scoreHouseholdSize', () => {
    it('should return 1.0 when unit has enough bedrooms', () => {
      // Household of 4, unit has 3 bedrooms, needs ceil(4/2) = 2
      expect(
        PlacementMatchingService.scoreHouseholdSize(mockClient, mockUnit),
      ).toBe(1.0);
    });

    it('should return 0.5 when one bedroom short', () => {
      const bigFamily = { ...mockClient, household_size: 7 };
      // needs ceil(7/2) = 4, unit has 3
      expect(
        PlacementMatchingService.scoreHouseholdSize(bigFamily, mockUnit),
      ).toBe(0.5);
    });

    it('should return 0.1 when significantly undersized', () => {
      const bigFamily = { ...mockClient, household_size: 10 };
      const tinyUnit = { ...mockUnit, bedrooms: 1 };
      expect(
        PlacementMatchingService.scoreHouseholdSize(bigFamily, tinyUnit),
      ).toBe(0.1);
    });
  });

  describe('scoreLocation', () => {
    it('should return 1.0 when city matches preferred area', () => {
      expect(
        PlacementMatchingService.scoreLocation(mockClient, mockUnit),
      ).toBe(1.0);
    });

    it('should return 0.5 when client has no preferred area', () => {
      const noPreference = { ...mockClient, preferred_area: null };
      expect(
        PlacementMatchingService.scoreLocation(noPreference, mockUnit),
      ).toBe(0.5);
    });

    it('should return 0.3 when city does not match', () => {
      const differentCity = { ...mockUnit, city: 'Raleigh' };
      expect(
        PlacementMatchingService.scoreLocation(mockClient, differentCity),
      ).toBe(0.3);
    });
  });

  describe('scoreLanguageCultural', () => {
    it('should return 1.0 when languages match', () => {
      expect(
        PlacementMatchingService.scoreLanguageCultural(mockClient, mockUnit),
      ).toBe(1.0);
    });

    it('should return 0.5 when either side has no language set', () => {
      const noLang = { ...mockClient, language_primary: null };
      expect(
        PlacementMatchingService.scoreLanguageCultural(noLang, mockUnit),
      ).toBe(0.5);
    });

    it('should return 0.3 when languages differ', () => {
      const differentLang = { ...mockUnit, language_spoken: 'French' };
      expect(
        PlacementMatchingService.scoreLanguageCultural(
          mockClient,
          differentLang,
        ),
      ).toBe(0.3);
    });
  });

  describe('scoreAccessibility', () => {
    it('should return 1.0 when client has no accessibility needs', () => {
      expect(
        PlacementMatchingService.scoreAccessibility(mockClient, mockUnit),
      ).toBe(1.0);
    });

    it('should return 0.1 when needs exist but unit has no features', () => {
      const needsClient = {
        ...mockClient,
        accessibility_needs: { wheelchair: true },
      };
      expect(
        PlacementMatchingService.scoreAccessibility(needsClient, mockUnit),
      ).toBe(0.1);
    });

    it('should score based on matched needs ratio', () => {
      const needsClient = {
        ...mockClient,
        accessibility_needs: { wheelchair: true, elevator: true },
      };
      const accessibleUnit = {
        ...mockUnit,
        accessibility_features: ['wheelchair ramp'],
      };
      expect(
        PlacementMatchingService.scoreAccessibility(
          needsClient,
          accessibleUnit,
        ),
      ).toBe(0.5); // 1 of 2 matched
    });
  });

  describe('scoreServicesProximity', () => {
    it('should return 0.7 for 2 nearby services', () => {
      expect(
        PlacementMatchingService.scoreServicesProximity(mockClient, mockUnit),
      ).toBe(0.7);
    });

    it('should return 1.0 for 4+ nearby services', () => {
      const serviceRich = {
        ...mockUnit,
        nearby_services: {
          transit: '1',
          schools: '2',
          grocery: '3',
          clinic: '4',
        },
      };
      expect(
        PlacementMatchingService.scoreServicesProximity(
          mockClient,
          serviceRich,
        ),
      ).toBe(1.0);
    });

    it('should return 0.2 for no nearby services', () => {
      const noServices = { ...mockUnit, nearby_services: {} };
      expect(
        PlacementMatchingService.scoreServicesProximity(
          mockClient,
          noServices,
        ),
      ).toBe(0.2);
    });
  });
});
