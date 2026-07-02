const express = require('express');
const app = express();
app.use(express.static(__dirname));
app.listen(8081, () => console.log('Static server on http://localhost:8081'));
