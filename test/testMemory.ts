/**
 * Test script for MemoryServiceV4
 */

import { config } from 'dotenv';
import { MemoryServiceV4 } from '../lib/services/memoryServiceV4';
import { MemoryIntegration } from '../lib/services/memoryIntegration';

config();

async function testMemoryService() {
  console.log('🧪 Testing MemoryServiceV4...\n');

  const service = new MemoryServiceV4({
    apiKey: process.env.MEM0_API_KEY!,
    projectId: process.env.MEM0_PROJECT_ID || 'test-project',
    userId: 'test-user',
    orgId: process.env.MEM0_ORG_ID
  });

  try {
    // Test 1: Initialize project
    console.log('1️⃣ Initializing project with compartments...');
    await service.initializeProject();
    console.log('✅ Project initialized\n');

    // Test 2: Add to success_exploits
    console.log('2️⃣ Adding successful exploit...');
    const exploit = await service.addToCompartment('success_exploits',
      'XSS bypass using double encoding: %253Cscript%253E worked on /search endpoint. WAF bypassed using Unicode normalization.',
      {
        payload: '%253Cscript%253Ealert(1)%253C/script%253E',
        target_url: 'https://target.com/search',
        bypass_method: 'double_encoding_unicode'
      }
    );
    console.log(`✅ Added exploit: ${exploit[0]?.id}\n`);

    // Test 3: Add to failed_attempts
    console.log('3️⃣ Adding failed attempt...');
    const failed = await service.addToCompartment('failed_attempts',
      'SQL injection blocked by CloudFlare WAF on login form. Pattern detected: union select',
      {
        protection: 'CloudFlare WAF',
        blocked_pattern: 'union select',
        target: '/login'
      }
    );
    console.log(`✅ Added failure: ${failed[0]?.id}\n`);

    // Test 4: Add reconnaissance
    console.log('4️⃣ Adding reconnaissance data...');
    const recon = await service.addToCompartment('reconnaissance',
      'Port scan revealed: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3306 (MySQL). Apache/2.4.41 detected.',
      {
        ports: [22, 80, 443, 3306],
        services: { web: 'Apache/2.4.41', db: 'MySQL' }
      }
    );
    console.log(`✅ Added recon: ${recon[0]?.id}\n`);

    // Test 5: Search with criteria
    console.log('5️⃣ Searching for exploits...');
    const searchResults = await service.searchWithCriteria('bypass', {
      priority: 'exploits',
      recency: true
    });
    console.log(`✅ Found ${searchResults.length} results\n`);

    // Test 6: Get compartment stats
    console.log('6️⃣ Getting compartment statistics...');
    const stats = await service.getCompartmentStats();
    console.log('📊 Compartment stats:', stats, '\n');

    // Test 7: Test memory integration
    console.log('7️⃣ Testing chat integration...');
    const integration = new MemoryIntegration(
      process.env.MEM0_PROJECT_ID || 'test-project',
      'test-user'
    );

    const chatResult = await integration.processChatMessage(
      'Remember: Found RCE vulnerability using deserialization in /api/upload endpoint'
    );
    console.log('✅ Chat processing:', chatResult.memoryResponse, '\n');

    // Test 8: Generate context
    console.log('8️⃣ Generating context for query...');
    const context = await integration.generateContext('XSS vulnerabilities');
    console.log('📝 Generated context:', context ? 'Found relevant memories' : 'No context', '\n');

    console.log('✅ All tests completed successfully!');

    return {
      success: true,
      stats
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error
    };
  }
}

// Run tests if called directly
if (require.main === module) {
  testMemoryService().then(result => {
    console.log('\n📊 Final result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

export { testMemoryService };