#!/usr/bin/env node

const { execSync } = require('child_process');
const { manageVersions } = require('./version-manager');

console.log('🚀 Inzu Deployment Script\n');

// Get change type from command line args
const args = process.argv.slice(2);
const changeType = args[0] || 'patch';

console.log(`📝 Change type: ${changeType}`);

// Step 1: Manage versions
console.log('\n📦 Step 1: Managing versions...');
const versions = manageVersions(changeType);

// Step 2: Ask for confirmation
console.log('\n❓ Ready to deploy?');
console.log(`   Cache: ${versions.cache}`);
console.log(`   App: ${versions.app}`);
console.log('\nCommands to run:');
console.log('   firebase deploy --only hosting');

// For now, just show what would be deployed
console.log('\n✅ Deployment preparation complete!');
console.log('💡 Run "firebase deploy --only hosting" to deploy');
