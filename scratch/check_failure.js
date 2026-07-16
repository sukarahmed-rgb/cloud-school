const fs = require('fs');
const path = require('path');

const contentPath = 'C:\\Users\\sukar\\.gemini\\antigravity\\brain\\5893acea-fac5-440d-97c5-490961e19a3d\\.system_generated\\steps\\736\\content.md';
const raw = fs.readFileSync(contentPath, 'utf8');

// The JSON is after the --- line
const parts = raw.split('---');
const jsonStr = parts[1].trim();

try {
  const data = JSON.parse(jsonStr);
  console.log("Job Statuses:");
  for (const job of data.jobs) {
    console.log(`Job: ${job.name}, Status: ${job.status}, Conclusion: ${job.conclusion}`);
    if (job.steps) {
      for (const step of job.steps) {
        if (step.conclusion === 'failure') {
          console.log(`  FAILED STEP: ${step.name}`);
        }
      }
    }
  }
} catch (err) {
  console.log("Error parsing JSON:", err.message);
}
