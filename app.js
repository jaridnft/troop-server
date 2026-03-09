require('dotenv').config();
const express = require('express');
const path = require('path');
const { port } = require('./config');
const { initDb } = require('./db');
const licenseRoutes = require('./routes/license');
const dataRoutes = require('./routes/data');

const app = express();

app.use(express.json());
app.get('/analytics.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics.js'));
});
app.use('/', licenseRoutes);
app.use('/data', dataRoutes);

async function startServer() {
  await initDb();
  app.listen(port);
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
};

