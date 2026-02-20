/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Household Safety Disclosure Constants
 *
 * Defines the attestation questions and configuration for the mandatory
 * parental disclosure system. Questions are designed to shift liability
 * to parents who provide false information.
 */

import { AttestationQuestion } from '../../types/entities/household-safety.entity';

/**
 * Attestation questions that parents must answer truthfully.
 *
 * Note: expectedAnswer indicates the "safe" answer. If a parent answers
 * differently, they cannot complete the disclosure and must contact support.
 */
export const ATTESTATION_QUESTIONS: AttestationQuestion[] = [
  {
    id: 'juvenile_legal_history',
    text: 'Has any minor residing in your household been adjudicated for violent offenses, sexual offenses, or offenses involving other minors?',
    required: true,
    expectedAnswer: false,
    helpText:
      'This includes any juvenile court findings for serious offenses. You are not required to disclose sealed records that you are legally prohibited from disclosing.',
  },
  {
    id: 'court_orders_against_you',
    text: 'Are there any active court orders or restraining orders issued AGAINST you or anyone in your household restricting contact with minors?',
    required: true,
    expectedAnswer: false,
    helpText:
      'This includes restraining orders, custody restrictions, or court-mandated supervision requirements involving minors. This does NOT include protective orders issued FOR your safety.',
  },
  {
    id: 'court_orders_protective',
    text: 'Do you have a protective order issued FOR your safety (e.g., domestic violence protection order)?',
    required: true,
    expectedAnswer: null, // CMP-11: VAWA — informational only, neither answer blocks
    helpText:
      'This is for your safety and confidential handling only. Having a protective order does NOT affect your eligibility. Your address will receive additional protections per VAWA.',
  },
  {
    id: 'cps_involvement',
    text: 'Has Child Protective Services had any substantiated findings against your household in the past 5 years?',
    required: true,
    expectedAnswer: false,
    helpText:
      'Substantiated means CPS determined abuse or neglect occurred. Unsubstantiated or unfounded reports do not need to be disclosed.',
  },
  {
    id: 'disclosure_accuracy',
    text: 'I certify under penalty of perjury that all information provided above is true, accurate, and complete to the best of my knowledge.',
    required: true,
    expectedAnswer: true,
    helpText:
      'Providing false information may result in immediate account termination and potential civil liability for damages caused to other users.',
  },
];

/**
 * How long a disclosure remains valid (in days)
 * Users must renew their disclosure annually
 */
export const DISCLOSURE_VALIDITY_DAYS = 365;

/**
 * How many days before expiration to start warning the user
 * Gives users 30 days to renew before their disclosure expires
 */
export const RENEWAL_WARNING_DAYS = 30;

/**
 * Minimum signature length (in characters) to be considered valid
 * Base64 encoded signatures should be at least this long
 */
export const MIN_SIGNATURE_LENGTH = 100;
