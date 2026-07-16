const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'worker', 'index.js');
let code = fs.readFileSync(filePath, 'utf8');

const targetStr = `  async fetch(request, env, ctx) {`;
const startIndex = code.indexOf(targetStr);

if (startIndex !== -1) {
  // We want to insert 'try {' right after the start of fetch, and then close it before the end of the object.
  // The fetch function body ends before the closing '  },\n};' at the end of the file.
  const endSignature = `    return respond({ error: 'Not found' }, 404);\n  },\n};`;
  const endIndex = code.indexOf(endSignature);

  if (endIndex !== -1) {
    const fetchBodyStart = startIndex + targetStr.length;
    const fetchBodyEnd = endIndex + `    return respond({ error: 'Not found' }, 404);\n  }`.length;

    let body = code.substring(fetchBodyStart, fetchBodyEnd);

    // Now wrap body in try/catch
    const wrappedBody = `
    try {
      ${body.trim()}
    } catch (err) {
      ctx.waitUntil(reportErrorToSentry(err, request, env));
      const origin = request.headers.get('origin');
      return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || 'https://cloud-school-6251a.web.app',
          'Access-Control-Allow-Credentials': 'true'
        }
      });
    }
    `;

    // Reconstruct the file and append the helper function at the bottom
    const newCode = code.substring(0, fetchBodyStart) + wrappedBody + "\n};\n\n" + `
async function reportErrorToSentry(err, request, env) {
  const dsn = env.SENTRY_DSN || "https://7c44e976db57fcf7c7c34d3d2db73b18@o4505678229340160.ingest.us.sentry.io/4508930292725760";
  if (!dsn) return;
  
  try {
    const dsnUrl = new URL(dsn);
    const projectId = dsnUrl.pathname.replace('/', '');
    const sentryUrl = \`\${dsnUrl.protocol}//\${dsnUrl.host}/api/\${projectId}/store/\`;
    
    const payload = {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString().split('.')[0],
      platform: "javascript",
      exception: {
        values: [
          {
            type: err.name || "Error",
            value: err.message || String(err),
            stacktrace: err.stack ? {
              frames: err.stack.split('\\n').slice(1).map(line => ({ filename: line.trim() }))
            } : undefined
          }
        ]
      },
      request: {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries())
      },
      environment: env.ENVIRONMENT || "production"
    };

    await fetch(sentryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': \`Sentry sentry_version=7,sentry_client=cloudflare-worker-custom/1.0.0,sentry_key=\${dsnUrl.username}\`
      },
      body: JSON.stringify(payload)
    });
  } catch (sentryErr) {
    console.error('Failed to send error to Sentry:', sentryErr);
  }
}
`;
    fs.writeFileSync(filePath, newCode, 'utf8');
    console.log("SUCCESSFULLY REFACTORED WORKER INDEX.JS!");
  } else {
    console.error("COULD NOT FIND END SIGNATURE IN WORKER!");
  }
} else {
  console.error("COULD NOT FIND FETCH START IN WORKER!");
}
