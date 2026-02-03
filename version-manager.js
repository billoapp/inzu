#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Version configuration
const VERSION_CONFIG = {
    swPath: './sw.js',
    currentCache: 'inzu-v1',
    currentApp: '1.0.0',
    autoIncrementCache: true,
    promptForAppVersion: true
};

// Get current versions from service worker
function getCurrentVersions() {
    const swContent = fs.readFileSync(VERSION_CONFIG.swPath, 'utf8');
    
    const cacheMatch = swContent.match(/const CACHE_NAME = '([^']+)'/);
    const appMatch = swContent.match(/const APP_VERSION = '([^']+)'/);
    
    return {
        cache: cacheMatch ? cacheMatch[1] : 'inzu-v1',
        app: appMatch ? appMatch[1] : '1.0.0'
    };
}

// Increment cache version (always +1)
function incrementCacheVersion(currentCache) {
    const match = currentCache.match(/inzu-v(\d+)/);
    if (match) {
        const currentNum = parseInt(match[1]);
        return `inzu-v${currentNum + 1}`;
    }
    return 'inzu-v1';
}

// Prompt for app version change
function promptForAppVersion(currentApp, changeType) {
    const [major, minor, patch] = currentApp.split('.').map(Number);
    
    let suggestedVersion;
    switch (changeType) {
        case 'patch':
            suggestedVersion = `${major}.${minor}.${patch + 1}`;
            break;
        case 'minor':
            suggestedVersion = `${major}.${minor + 1}.0`;
            break;
        case 'major':
            suggestedVersion = `${major + 1}.0.0`;
            break;
        default:
            suggestedVersion = currentApp;
    }
    
    console.log(`\n📦 Current app version: ${currentApp}`);
    console.log(`💡 Suggested version (${changeType}): ${suggestedVersion}`);
    console.log(`🔧 Options:`);
    console.log(`   1. Use suggested: ${suggestedVersion}`);
    console.log(`   2. Keep same: ${currentApp}`);
    console.log(`   3. Custom version`);
    
    // For now, auto-use suggested (can be enhanced with actual prompts)
    return suggestedVersion;
}

// Update service worker with new versions
function updateServiceWorker(newCache, newApp) {
    const swContent = fs.readFileSync(VERSION_CONFIG.swPath, 'utf8');
    
    const updatedContent = swContent
        .replace(/const CACHE_NAME = '[^']+'/, `const CACHE_NAME = '${newCache}'`)
        .replace(/const APP_VERSION = '[^']+'/, `const APP_VERSION = '${newApp}'`);
    
    fs.writeFileSync(VERSION_CONFIG.swPath, updatedContent);
    
    console.log(`✅ Updated service worker:`);
    console.log(`   Cache: ${newCache}`);
    console.log(`   App: ${newApp}`);
}

// Main version management function
function manageVersions(changeType = 'patch') {
    console.log('🔧 Managing versions...\n');
    
    const current = getCurrentVersions();
    console.log(`📋 Current versions:`);
    console.log(`   Cache: ${current.cache}`);
    console.log(`   App: ${current.app}`);
    
    // Always increment cache version
    const newCache = incrementCacheVersion(current.cache);
    console.log(`\n🔄 Cache version: ${current.cache} → ${newCache}`);
    
    // Handle app version
    let newApp;
    if (VERSION_CONFIG.promptForAppVersion) {
        newApp = promptForAppVersion(current.app, changeType);
    } else {
        newApp = current.app; // Keep same if auto-mode
    }
    
    if (newApp !== current.app) {
        console.log(`📈 App version: ${current.app} → ${newApp}`);
    } else {
        console.log(`📋 App version: ${current.app} (unchanged)`);
    }
    
    // Update files
    updateServiceWorker(newCache, newApp);
    
    console.log(`\n✅ Version management complete!`);
    console.log(`🚀 Ready to deploy with: firebase deploy`);
    
    return { cache: newCache, app: newApp };
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const changeType = args[0] || 'patch'; // Default to patch
    
    if (!['patch', 'minor', 'major', 'none'].includes(changeType)) {
        console.error('❌ Invalid change type. Use: patch, minor, major, or none');
        process.exit(1);
    }
    
    manageVersions(changeType);
}

module.exports = { manageVersions, getCurrentVersions, incrementCacheVersion };
