
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const seedAdmin = require('./seeder');
const { apiLimiter } = require('./middleware/limiter');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files if needed for admin to download later
app.use('/uploads', express.static('uploads'));

// Rate Limiting (Throttling)
app.use('/api', apiLimiter);

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/emailshooter';
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    // Run Seeder
    await seedAdmin();
  })
  .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/campaign', require('./routes/campaign'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/ai', require('./routes/ai'));

// Health Check
app.get('/', (req, res) => {
  res.send('Email Shooter API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});