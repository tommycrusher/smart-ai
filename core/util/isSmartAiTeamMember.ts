/**
 * Utility to check if a user is a Smart AI team member
 */
export function isSmartAiTeamMember(email?: string): boolean {
  if (!email) return false;
  return email.endsWith("@smart-ai.dev");
}
