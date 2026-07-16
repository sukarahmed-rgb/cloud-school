const fs = require('fs');
const path = require('path');

const possiblePaths = [
  path.join(process.env.USERPROFILE, '.config', '.wrangler', 'config', 'default.json'),
  path.join(process.env.USERPROFILE, '.config', 'wrangler', 'config', 'default.json'),
  path.join(process.env.USERPROFILE, '.wrangler', 'config', 'default.json'),
  path.join(process.env.LOCALAPPDATA, '.wrangler', 'config', 'default.json'),
  path.join(process.env.LOCALAPPDATA, 'wrangler', 'config', 'default.json'),
  path.join(process.env.LOCALAPPDATA, 'wrangler-nodejs', 'config', 'default.json'),
  path.join(process.env.APPDATA, '.wrangler', 'config', 'default.json'),
  path.join(process.env.APPDATA, 'wrangler', 'config', 'default.json'),
  path.join(process.env.USERPROFILE, 'AppData', 'Local', '.wrangler', 'config', 'default.json')
];

console.log("Checking possible Wrangler config paths...");
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    console.log("FOUND CONFIG FILE AT:", p);
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      console.log("OAuth Token keys:", Object.keys(data));
      if (data.oauth_token) {
        console.log("SUCCESS_OAUTH_TOKEN:", data.oauth_token);
      }
    } catch (err) {
      console.log("Error reading file:", err.message);
    }
  }
}
