/**
 * Configuration Mem0 pour le client
 * Les clés NEXT_PUBLIC_ sont accessibles côté client
 */

export const mem0Config = {
  apiKey: process.env.NEXT_PUBLIC_MEM0_API_KEY || process.env.MEM0_API_KEY || '',
  projectId: process.env.NEXT_PUBLIC_MEM0_PROJECT_ID || process.env.MEM0_PROJECT_ID || '',
  orgId: process.env.NEXT_PUBLIC_MEM0_ORG_ID || process.env.MEM0_ORG_ID || '',

  // Valeurs par défaut pour le dev
  defaults: {
    apiKey: 'm0-34u8VxkLt0KQ77hRbz879jl26e5lywZcepPjlawU',
    projectId: 'proj_dH7FOsMuUxR2n3xssM8xd6iRGh10NjIcSv7qGOhX',
    orgId: 'org_9wtNEn9QMgcKq8LC5Zyrkhp5XO9UMQ4XsFJiPWxt'
  }
};

// Utiliser les valeurs par défaut si les env vars sont vides
export function getMem0Config() {
  return {
    apiKey: mem0Config.apiKey || mem0Config.defaults.apiKey,
    projectId: mem0Config.projectId || mem0Config.defaults.projectId,
    orgId: mem0Config.orgId || mem0Config.defaults.orgId
  };
}