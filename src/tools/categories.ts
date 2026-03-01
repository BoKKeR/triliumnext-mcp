/**
 * Tool categories for organization and filtering
 */
export const TOOL_CATEGORIES = [
  'notes',
  'search',
  'organization',
  'attributes',
  'calendar',
  'system',
  'attachments',
  'revisions',
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];
