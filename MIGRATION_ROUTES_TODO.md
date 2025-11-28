# SQLite Migration - Route Files Update Guide

## ✅ COMPLETED

All route files have been successfully updated! This document is kept for reference only.

## Overview
All route files that use `configManager.getServices()` have been updated to use `await` since ConfigManager methods are now async (backed by SQLite).

## Files Updated ✅
1. ✅ server/routes/sonarr.js - 13 instances
2. ✅ server/routes/radarr.js - 2 instances
3. ✅ server/routes/lidarr.js - 5 instances
4. ✅ server/routes/readarr.js - 4 instances
5. ✅ server/routes/prowlarr.js - 4 instances
6. ✅ server/routes/jackett.js - 3 instances
7. ✅ server/routes/sabnzbd.js - 8 instances
8. ✅ server/routes/nzbget.js - 3 instances
9. ✅ server/routes/qbittorrent.js - 8 instances
10. ✅ server/routes/transmission.js - 2 instances
11. ✅ server/routes/deluge.js - 3 instances
12. ✅ server/routes/overseerr.js - 5 instances
13. ✅ server/routes/tautulli.js - 4 instances
14. ✅ server/routes/unraid.js - 6 instances

**Total: 68 instances across 14 files - ALL COMPLETE**

## Required Changes

### Pattern 1: Add async to function signature
```javascript
// BEFORE:
router.get('/instances', (req, res) => {

// AFTER:
router.get('/instances', async (req, res) => {
```

### Pattern 2: Add await to configManager calls
```javascript
// BEFORE:
const instances = configManager.getServices('sonarr');

// AFTER:
const instances = await configManager.getServices('sonarr');
```

## Find and Replace Instructions

### Option 1: Using VS Code Find and Replace (Regex)
1. Open "Find in Files" (Ctrl+Shift+F / Cmd+Shift+F)
2. Set "files to include": `server/routes/*.js`
3. Enable regex mode
4. Find: `const instances = configManager\.getServices\(`
5. Replace: `const instances = await configManager.getServices(`
6. Replace All

Then for making functions async:
1. Find: `router\.get\('/instances', \(req, res\) =>`
2. Replace: `router.get('/instances', async (req, res) =>`
3. Replace All

### Option 2: Manual Update Per File
For each file listed above:

1. Find every occurrence of `configManager.getServices`
2. Add `await` before it
3. Ensure the containing function is `async`

Example full transformation:

```javascript
// BEFORE:
router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    // ... rest of code
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AFTER:
router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    // ... rest of code
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Verification
After making changes, check for:
1. No `configManager.getServices` calls without `await`
2. All functions with `await configManager.getServices` are `async`
3. No syntax errors (run ESLint or build the project)

## Testing
After updates:
```bash
npm start
```

Check that:
- Server starts without errors
- All service instances load correctly
- No "await is a reserved word" or similar errors
- API endpoints respond correctly
