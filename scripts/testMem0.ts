#!/usr/bin/env npx tsx

import { MemoryServiceV4 } from '../lib/services/memoryServiceV4';
import { getMem0Config } from '../lib/config/mem0';

async function testMem0Integration() {
  console.log('🚀 Testing Mem0 Integration...\n');

  const config = getMem0Config();
  console.log('📝 Configuration:');
  console.log('- API Key:', config.apiKey ? '✅ Found' : '❌ Missing');
  console.log('- Project ID:', config.projectId);
  console.log('- Org ID:', config.orgId);
  console.log('');

  try {
    const service = new MemoryServiceV4({
      apiKey: config.apiKey,
      projectId: config.projectId,
      userId: 'system',
      orgId: config.orgId
    });

    console.log('🔧 Initializing compartments...');
    await service.initializeProject();
    console.log('✅ Compartments initialized!\n');

    // Test adding to each compartment
    const testData = [
      {
        compartment: 'success_exploits',
        content: 'SQL injection vulnerability found in login form. Payload: \' OR 1=1 --',
        metadata: { target: 'login.php', severity: 'critical' }
      },
      {
        compartment: 'failed_attempts',
        content: 'XSS attempt blocked by WAF on contact form',
        metadata: { target: 'contact.php', reason: 'WAF block' }
      },
      {
        compartment: 'reconnaissance',
        content: 'Port scan revealed: 22/SSH, 80/HTTP, 443/HTTPS, 3306/MySQL',
        metadata: { target: '192.168.1.100', tool: 'nmap' }
      },
      {
        compartment: 'active_plans',
        content: 'Next: Try directory traversal on file upload functionality',
        metadata: { priority: 'high', status: 'pending' }
      },
      {
        compartment: 'patterns',
        content: 'Pattern detected: All forms vulnerable to CSRF - missing tokens',
        metadata: { type: 'vulnerability_pattern' }
      }
    ];

    console.log('📝 Adding test data to compartments...\n');

    for (const item of testData) {
      console.log(`Adding to ${item.compartment}...`);
      const result = await service.addToCompartment(
        item.compartment,
        item.content,
        item.metadata
      );
      console.log(`✅ Added: ${result?.id || 'Success'}\n`);
    }

    // Test searching
    console.log('🔍 Testing search functionality...\n');

    const searchTerms = ['SQL injection', 'port scan', 'WAF'];

    for (const term of searchTerms) {
      console.log(`Searching for: "${term}"`);
      const results = await service.searchWithCriteria(term, { limit: 3 });
      console.log(`Found ${results?.length || 0} results`);
      if (results && results.length > 0) {
        results.forEach((r: any) => {
          console.log(`  - ${r.memory?.substring(0, 50)}...`);
        });
      }
      console.log('');
    }

    // Get stats for each compartment
    console.log('📊 Getting compartment stats...\n');
    const compartments = ['success_exploits', 'failed_attempts', 'reconnaissance', 'active_plans', 'patterns'];

    for (const comp of compartments) {
      const results = await service.searchCompartment(comp, '', { limit: 100 });
      console.log(`${comp}: ${results?.length || 0} memories`);
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
    }
  }
}

// Run the test
testMem0Integration().catch(console.error);