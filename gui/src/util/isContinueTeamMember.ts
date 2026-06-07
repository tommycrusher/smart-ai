/**
 * Utility to check if a user is a Smart AI team member
 */
export function isContinueTeamMember(email?: string): boolean {
  if (!email) return false;
  return email.includes("@smart-ai.dev");
}
