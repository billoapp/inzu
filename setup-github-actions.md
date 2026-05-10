# GitHub Actions Setup for Firebase Hosting

## ✅ Workflows Updated
Your GitHub Actions workflows have been updated to use the correct Firebase project `inzu-home`.

## 🔧 Required Setup Steps

### Step 1: Generate Firebase Service Account Key

1. **Go to Firebase Console**: https://console.firebase.google.com/project/inzu-home/settings/serviceaccounts
2. **Click**: "Generate new private key"
3. **Select**: JSON format
4. **Click**: "Generate"
5. **Save** the downloaded JSON file

### Step 2: Add GitHub Secret

1. **Go to your GitHub repository**
2. **Navigate to**: Settings → Secrets and variables → Actions
3. **Click**: "New repository secret"
4. **Name**: `FIREBASE_SERVICE_ACCOUNT_INZU_HOME`
5. **Value**: Paste the entire contents of the JSON file you downloaded
6. **Click**: "Add secret"

### Step 3: Verify Workflow Files

Your workflows are now configured for:
- ✅ **Project ID**: `inzu-home`
- ✅ **No build step required** (static files)
- ✅ **Deploy on push to main**
- ✅ **Preview on pull requests**

## 🚀 How It Works

### Automatic Deployment
- **Push to main** → Automatic deployment to production
- **Pull Request** → Preview deployment for testing

### Deployment URLs
- **Production**: `https://inzu-home.web.app`
- **Preview**: Available in PR comments

## 📁 Files to Deploy
The workflow will automatically deploy:
- `index.html`
- `script.js` (with export fixes)
- `styles.css`
- `manifest.json`
- `firebase-config.js`
- `sw.js`
- Icon files

## 🔍 Testing

1. **Push changes to main branch**
2. **Check**: Actions tab in GitHub
3. **Verify**: Deployment completes successfully
4. **Visit**: `https://inzu-home.web.app`

## 🛠️ Troubleshooting

If deployment fails:
1. Check Actions tab for error details
2. Verify secret name matches exactly
3. Ensure JSON key has correct permissions
4. Check that project ID is `inzu-home`

## ✨ Benefits

- **No more network issues** - GitHub handles deployment
- **Automatic updates** - Push and deploy
- **Preview deployments** - Test before merging
- **Version history** - Track all deployments
