const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SOM Platform API is running', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/capex', require('./routes/capex'));
app.use('/api/purchase-requests', require('./routes/purchaseRequests'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/portal', require('./routes/portal'));

// Error handler
app.use(require('./middleware/errorHandler'));

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`SOM Platform backend running on port ${PORT}`);
  });
}

module.exports = app;
