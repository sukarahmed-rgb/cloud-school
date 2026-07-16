const fs = require('fs');
const path = require('path');

function searchFile(dir, fileName) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch (e) {
        continue;
      }
      if (stat && stat.isDirectory()) {
        // Skip some massive folders to avoid getting stuck
        if (file === 'node_modules' || file === 'cache' || file === 'Local History' || file === 'System Volume Information' || file === '$RECYCLE.BIN') {
          continue;
        }
        results = results.concat(searchFile(filePath, fileName));
      } else if (file === fileName) {
        results.push(filePath);
      }
    }
  } catch (err) {
    // Ignore permissions errors
  }
  return results;
}

const userProfile = process.env.USERPROFILE || 'C:\\Users\\sukar';
console.log("Searching user profile directory:", userProfile);
const appDataLocal = path.join(userProfile, 'AppData', 'Local');
const appDataRoaming = path.join(userProfile, 'AppData', 'Roaming');
const dotConfig = path.join(userProfile, '.config');

let foundFiles = [];
foundFiles = foundFiles.concat(searchFile(appDataLocal, 'default.json'));
foundFiles = foundFiles.concat(searchFile(appDataRoaming, 'default.json'));
foundFiles = foundFiles.concat(searchFile(dotConfig, 'default.json'));

console.log("Found files:", foundFiles);

for (const p of foundFiles) {
  if (p.toLowerCase().includes('wrangler')) {
    console.log("Found wrangler file:", p);
    try {
      const content = fs.readFileSync(p, 'utf8');
      console.log("File content snippet:", content.substring(0, 200));
    } catch (e) {
      console.log("Error reading file:", e.message);
    }
  }
}
