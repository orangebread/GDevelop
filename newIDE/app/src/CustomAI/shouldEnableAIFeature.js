// @flow

/**
 * Helper function to determine if AI features should be enabled in the UI.
 * This is ONLY for UI gating (showing/hiding AI features).
 * It does NOT control fallback behavior.
 */

import { type Subscription, type Limits } from '../Utils/GDevelopServices/Usage';
import { hasValidSubscriptionPlan } from '../Utils/GDevelopServices/Usage';
import type { CustomAISettings } from './CustomAISettings';

/**
 * Determines if AI features should be enabled in the UI.
 * 
 * @param customAISettings - Custom AI configuration
 * @param subscription - User's subscription status
 * @param limits - User's usage limits
 * @returns true if AI features should be enabled
 */
export const shouldEnableAIFeature = (
  customAISettings: ?CustomAISettings,
  subscription: ?Subscription,
  limits: ?Limits
): boolean => {
  // If custom AI enabled, always allow (bypass subscription checks)
  if (customAISettings && customAISettings.enabled) return true;

  // Otherwise, check GDevelop subscription and quota
  const aiQuota = limits && limits.quotas && limits.quotas['ai-request'];
  return (
    hasValidSubscriptionPlan(subscription) &&
    (!aiQuota || !aiQuota.limitReached)
  );
};

