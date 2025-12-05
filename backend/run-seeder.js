
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const seedAdmin = require('./seeder');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/emailshooter';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected for Seeding...');
    await seedAdmin();
    console.log('Seeding Process Finished.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Seeding Connection Error:', err);
    process.exit(1);
  });
