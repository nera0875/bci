/**
 * Initialize Mem0 project with pentesting compartments
 */

import { MemoryServiceV4 } from './memoryServiceV4';

export async function initializeMemoryProject() {
  const service = new MemoryServiceV4({
    apiKey: process.env.MEM0_API_KEY!,
    projectId: process.env.MEM0_PROJECT_ID!,
    userId: 'system', // System user for init
    orgId: process.env.MEM0_ORG_ID
  });

  try {
    console.log('🚀 Initializing Mem0 project with pentesting compartments...');
    await service.initializeProject();

    console.log('📊 Getting compartment stats...');
    const stats = await service.getCompartmentStats();
    console.log('Current compartment counts:', stats);

    return { success: true, stats };
  } catch (error) {
    console.error('❌ Failed to initialize memory project:', error);
    return { success: false, error };
  }
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  initializeMemoryProject().then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}