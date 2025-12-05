
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'ADMIN', deletedAt: null });
    
    if (!adminExists) {
      console.log('Seeding: Creating default Admin user...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password', salt);
      
      const admin = new User({
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE'
      });
      
      await admin.save();
      console.log('Seeding: Default Admin created (username: admin, password: password)');
    } else {
      console.log('Seeding: Admin already exists.');
    }
  } catch (error) {
    console.error('Seeding Error:', error);
  }
};

module.exports = seedAdmin;
