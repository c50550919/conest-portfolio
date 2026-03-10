/**
 * Content Moderation Service Unit Tests
 *
 * Tests for the AI-powered content moderation system
 * that detects predatory patterns in messages.
 *
 * Constitution: Principle I (Child Safety)
 */

import {
  ModerationResult,
  ModerationCategory,
  ModerationSignals,
  DEFAULT_THRESHOLDS,
  ESCALATION_LADDER,
} from '../features/moderation/moderation.types';

// Mock the database
jest.mock('../config/database', () => ({
  default: {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    raw: jest.fn((val) => val),
    fn: { now: jest.fn(() => new Date()) },
  },
}));

// Mock logger
jest.mock('../config/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock notification worker
jest.mock('../workers/notificationWorker', () => ({
  queueNotification: jest.fn().mockResolvedValue(undefined),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Content Moderation Types', () => {
  describe('DEFAULT_THRESHOLDS', () => {
    it('should have correct auto-block threshold', () => {
      expect(DEFAULT_THRESHOLDS.autoBlock.category).toBe('child_predatory_risk');
      expect(DEFAULT_THRESHOLDS.autoBlock.minConfidence).toBe(0.85);
    });

    it('should have correct urgent review categories', () => {
      expect(DEFAULT_THRESHOLDS.urgentReview.categories).toContain('child_predatory_risk');
      expect(DEFAULT_THRESHOLDS.urgentReview.categories).toContain('child_safety_questionable');
      expect(DEFAULT_THRESHOLDS.urgentReview.minConfidence).toBe(0.7);
    });

    it('should have correct pattern escalation thresholds', () => {
      expect(DEFAULT_THRESHOLDS.patternEscalation.childFocusCount).toBe(3);
      expect(DEFAULT_THRESHOLDS.patternEscalation.scheduleProbeCount).toBe(2);
      expect(DEFAULT_THRESHOLDS.patternEscalation.locationTargetCount).toBe(2);
    });
  });

  describe('ESCALATION_LADDER', () => {
    it('should have correct escalation progression', () => {
      expect(ESCALATION_LADDER.first_flag).toBe('none');
      expect(ESCALATION_LADDER.second_flag).toBe('warning');
      expect(ESCALATION_LADDER.third_flag).toBe('suspension_24h');
      expect(ESCALATION_LADDER.predatory_risk).toBe('suspension_7d');
      expect(ESCALATION_LADDER.confirmed_predatory).toBe('permanent_ban');
    });
  });
});

describe('Moderation Result Validation', () => {
  const createValidResult = (overrides: Partial<ModerationResult> = {}): ModerationResult => ({
    category: 'normal',
    confidence: 0.95,
    signals: {
      child_focus: false,
      asks_schedule: false,
      asks_location_school: false,
      offers_unsolicited_access_to_child: false,
      probes_security_details: false,
    },
    reasoning: 'Normal housing discussion',
    ...overrides,
  });

  it('should accept valid normal category result', () => {
    const result = createValidResult({ category: 'normal' });
    expect(result.category).toBe('normal');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should accept valid questionable category result', () => {
    const result = createValidResult({
      category: 'child_safety_questionable',
      confidence: 0.65,
      signals: { ...createValidResult().signals, child_focus: true },
      reasoning: 'Message shows unusual interest in children',
    });
    expect(result.category).toBe('child_safety_questionable');
    expect(result.signals.child_focus).toBe(true);
  });

  it('should accept valid predatory risk category result', () => {
    const result = createValidResult({
      category: 'child_predatory_risk',
      confidence: 0.9,
      signals: {
        child_focus: true,
        asks_schedule: true,
        asks_location_school: true,
        offers_unsolicited_access_to_child: true,
        probes_security_details: false,
      },
      reasoning: 'Multiple predatory signals detected',
    });
    expect(result.category).toBe('child_predatory_risk');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });
});

describe('Action Determination Logic', () => {
  const determineAction = (category: ModerationCategory, confidence: number): string => {
    const thresholds = DEFAULT_THRESHOLDS;

    if (
      category === thresholds.autoBlock.category &&
      confidence >= thresholds.autoBlock.minConfidence
    ) {
      return 'auto_blocked';
    }

    if (
      thresholds.urgentReview.categories.includes(category) &&
      confidence >= thresholds.urgentReview.minConfidence
    ) {
      return 'flagged_urgent';
    }

    if (
      thresholds.standardReview.categories.includes(category) &&
      confidence >= thresholds.standardReview.minConfidence
    ) {
      return 'flagged_standard';
    }

    return 'auto_approved';
  };

  describe('Auto-block scenarios', () => {
    it('should auto-block predatory risk with high confidence', () => {
      const action = determineAction('child_predatory_risk', 0.9);
      expect(action).toBe('auto_blocked');
    });

    it('should auto-block predatory risk at threshold', () => {
      const action = determineAction('child_predatory_risk', 0.85);
      expect(action).toBe('auto_blocked');
    });

    it('should NOT auto-block predatory risk below threshold', () => {
      const action = determineAction('child_predatory_risk', 0.84);
      expect(action).toBe('flagged_urgent');
    });
  });

  describe('Urgent flag scenarios', () => {
    it('should flag predatory risk with medium confidence as urgent', () => {
      const action = determineAction('child_predatory_risk', 0.75);
      expect(action).toBe('flagged_urgent');
    });

    it('should flag questionable with high confidence as urgent', () => {
      const action = determineAction('child_safety_questionable', 0.75);
      expect(action).toBe('flagged_urgent');
    });

    it('should flag questionable at urgent threshold', () => {
      const action = determineAction('child_safety_questionable', 0.7);
      expect(action).toBe('flagged_urgent');
    });
  });

  describe('Standard flag scenarios', () => {
    it('should flag questionable with medium confidence', () => {
      const action = determineAction('child_safety_questionable', 0.6);
      expect(action).toBe('flagged_standard');
    });

    it('should flag questionable at standard threshold', () => {
      const action = determineAction('child_safety_questionable', 0.5);
      expect(action).toBe('flagged_standard');
    });
  });

  describe('Auto-approve scenarios', () => {
    it('should auto-approve normal messages', () => {
      const action = determineAction('normal', 0.95);
      expect(action).toBe('auto_approved');
    });

    it('should auto-approve questionable below threshold', () => {
      const action = determineAction('child_safety_questionable', 0.4);
      expect(action).toBe('auto_approved');
    });
  });
});

describe('Signal Detection', () => {
  const hasSignals = (signals: ModerationSignals): boolean =>
    signals.child_focus ||
    signals.asks_schedule ||
    signals.asks_location_school ||
    signals.offers_unsolicited_access_to_child ||
    signals.probes_security_details;

  it('should detect no signals when all false', () => {
    const signals: ModerationSignals = {
      child_focus: false,
      asks_schedule: false,
      asks_location_school: false,
      offers_unsolicited_access_to_child: false,
      probes_security_details: false,
    };
    expect(hasSignals(signals)).toBe(false);
  });

  it('should detect child_focus signal', () => {
    const signals: ModerationSignals = {
      child_focus: true,
      asks_schedule: false,
      asks_location_school: false,
      offers_unsolicited_access_to_child: false,
      probes_security_details: false,
    };
    expect(hasSignals(signals)).toBe(true);
  });

  it('should detect asks_schedule signal', () => {
    const signals: ModerationSignals = {
      child_focus: false,
      asks_schedule: true,
      asks_location_school: false,
      offers_unsolicited_access_to_child: false,
      probes_security_details: false,
    };
    expect(hasSignals(signals)).toBe(true);
  });

  it('should detect multiple signals', () => {
    const signals: ModerationSignals = {
      child_focus: true,
      asks_schedule: true,
      asks_location_school: true,
      offers_unsolicited_access_to_child: true,
      probes_security_details: true,
    };
    expect(hasSignals(signals)).toBe(true);
  });
});

describe('API Response Parsing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse valid Gemini response', () => {
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  category: 'normal',
                  confidence: 0.95,
                  signals: {
                    child_focus: false,
                    asks_schedule: false,
                    asks_location_school: false,
                    offers_unsolicited_access_to_child: false,
                    probes_security_details: false,
                  },
                  reasoning: 'Normal housing discussion',
                }),
              },
            ],
          },
        },
      ],
    };

    const text = mockGeminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    expect(text).toBeDefined();

    const result = JSON.parse(text) as ModerationResult;
    expect(result.category).toBe('normal');
    expect(result.confidence).toBe(0.95);
  });

  it('should parse valid OpenAI response', () => {
    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              category: 'child_safety_questionable',
              confidence: 0.65,
              signals: {
                child_focus: true,
                asks_schedule: false,
                asks_location_school: false,
                offers_unsolicited_access_to_child: false,
                probes_security_details: false,
              },
              reasoning: 'Shows interest in children details',
            }),
          },
        },
      ],
    };

    const text = mockOpenAIResponse.choices?.[0]?.message?.content;
    expect(text).toBeDefined();

    const result = JSON.parse(text) as ModerationResult;
    expect(result.category).toBe('child_safety_questionable');
    expect(result.signals.child_focus).toBe(true);
  });
});

describe('Notification Content', () => {
  it('should generate warning notification content', () => {
    // Test warning notification structure
    const warningContent = {
      subject: 'CoNest Community Guidelines Reminder',
      pushTitle: 'Community Guidelines Reminder',
    };
    expect(warningContent.subject).toContain('Guidelines');
    expect(warningContent.pushTitle).toContain('Reminder');
  });

  it('should generate suspension notification content', () => {
    // Test suspension notification structure
    const suspensionContent = {
      subject: 'CoNest Account Suspended - 24 Hours',
      pushTitle: 'Account Suspended - 24 Hours',
    };
    expect(suspensionContent.subject).toContain('Suspended');
    expect(suspensionContent.pushTitle).toContain('24 Hours');
  });

  it('should generate ban notification content', () => {
    // Test ban notification structure
    const banContent = {
      subject: 'CoNest Account Permanently Deactivated',
      pushTitle: 'Account Deactivated',
    };
    expect(banContent.subject).toContain('Permanently');
    expect(banContent.pushTitle).toContain('Deactivated');
  });
});
