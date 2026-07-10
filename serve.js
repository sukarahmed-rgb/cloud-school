const express = require('express');
const app = express();

app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'microphone=self, camera=()');
    next();
});

app.use(express.static(__dirname));
app.listen(8081, () => console.log('Static server on http://localhost:8081'));
