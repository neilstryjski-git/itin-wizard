/**
 * Centralized feature flags for the application.
 * Toggled via boolean values.
 */
export const FEATURE_FLAGS = {
  // Hide packing list while we iterate on usability
  PACKING_LIST_ENABLED: false,
  
  // Show travel requirements derived from Phase 1
  REQUIREMENTS_SECTION_ENABLED: true,
};
