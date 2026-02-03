# 🚀 Version Management System

## 📋 Overview
Automatic version management for Inzu Rental Manager PWA deployments.

## 🔧 Usage

### Quick Deploy (Auto Version Management)
```bash
# Deploy with patch version increment (bug fixes)
npm run deploy:patch

# Deploy with minor version increment (new features)  
npm run deploy:minor

# Deploy with major version increment (breaking changes)
npm run deploy:major

# Deploy without changing app version
npm run deploy:none
```

### Manual Version Management
```bash
# Just update versions (no deployment)
npm run version:patch
npm run version:minor
npm run version:major

# Deploy to Firebase (after version update)
npm run deploy:firebase
```

## 📦 Version Rules

### Cache Version (Always Auto-Incremented)
- Format: `inzu-v3` → `inzu-v4` → `inzu-v5`
- Purpose: Forces browser cache refresh
- Rule: **Always +1 for ANY deployment**

### App Version (Semantic)
- Format: `3.0.0` (MAJOR.MINOR.PATCH)
- Purpose: Human-readable version tracking
- Rules:
  - **PATCH** (`3.0.0` → `3.0.1`): Bug fixes, small improvements
  - **MINOR** (`3.0.1` → `3.1.0`): New features, additions
  - **MAJOR** (`3.1.0` → `4.0.0`): Breaking changes, major redesigns

## 🔄 Deployment Workflow

1. **Make your code changes**
2. **Run appropriate deploy command**:
   ```bash
   npm run deploy:patch    # For bug fixes
   npm run deploy:minor    # For new features
   npm run deploy:major    # For major changes
   ```
3. **System will**:
   - Auto-increment cache version
   - Suggest app version change
   - Update service worker
   - Prompt for Firebase deployment

## 📁 Files Modified

- `sw.js` - Service worker with version constants
- `version-manager.js` - Version management logic
- `deploy.js` - Deployment orchestration
- `package.json` - NPM scripts

## 🎯 Best Practices

1. **Always use version-managed deployment** - never deploy directly
2. **Choose appropriate change type** - patch/minor/major
3. **Test locally** before deploying
4. **Keep changelog** of what each version includes
5. **Backup data** before major deployments

## 🔍 Current Versions

Check `sw.js` for current versions:
```javascript
const CACHE_NAME = 'inzu-v3';     // Cache version
const APP_VERSION = '3.0.0';       // App version
```

## 🚨 Important

- **Cache version ALWAYS increments** - ensures users get latest files
- **App version is optional** but recommended for tracking
- **All deployments require version increment** for proper cache busting
