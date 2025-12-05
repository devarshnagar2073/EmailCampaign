
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const { encrypt, decrypt } = require('../utils/security');
const { authLimiter } = require('../middleware/limiter');

// @route   POST api/auth/register
// @desc    Register a new user (Pending Approval)
router.post('/register', authLimiter, async (req, res) => {
    const { username, password } = req.body;
  
    try {
      let user = await User.findOne({ username });
      if (user) {
          if (user.deletedAt) return res.status(400).json({ msg: 'Username taken (inactive account).' });
          return res.status(400).json({ msg: 'User already exists' });
      }
  
      user = new User({
        username,
        password,
        role: 'USER',
        status: 'PENDING'
      });
  
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
  
      await user.save();
      res.json({ msg: 'Registration successful. Pending admin approval.' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check for active user (not deleted)
    let user = await User.findOne({ username, deletedAt: null });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Check Approval Status
    if (user.status !== 'ACTIVE') {
        return res.status(403).json({ msg: 'Account is pending approval or suspended.' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    // Decrypt SMTP password before sending to frontend (needed for 'Test Connection' UI usage if not masked)
    const smtpConfig = user.smtpConfig ? {
        ...user.smtpConfig,
        pass: decrypt(user.smtpConfig.pass)
    } : {};

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { id: user.id, username: user.username, role: user.role, smtpConfig } });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/user
// @desc    Get logged in user data
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id, deletedAt: null }).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    
    // Decrypt pass
    const smtpConfig = user.smtpConfig ? {
        host: user.smtpConfig.host,
        port: user.smtpConfig.port,
        user: user.smtpConfig.user,
        pass: decrypt(user.smtpConfig.pass),
        fromEmail: user.smtpConfig.fromEmail
    } : {};

    // Explicitly construct response to ensure virtual 'id' is included and matches interface
    const userResponse = {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        smtpConfig: smtpConfig,
        dailyQuota: user.dailyQuota,
        emailsSentToday: user.emailsSentToday,
        createdAt: user.createdAt,
        lastSentDate: user.lastSentDate
    };
    
    res.json(userResponse);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth/users
// @desc    Register a user (Admin only - Direct Create)
router.post('/users', auth, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  const { username, password, role } = req.body;

  try {
    let user = await User.findOne({ username });
    if (user) {
        if (user.deletedAt) {
            return res.status(400).json({ msg: 'Username taken (inactive account).' });
        }
        return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      username,
      password,
      role: role || 'USER',
      status: 'ACTIVE' // Admin created users are active by default
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/users
// @desc    Get all users (Admin only)
router.get('/users', auth, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ msg: 'Access denied' });
  }
  try {
    // Only fetch active/pending users
    const users = await User.find({ deletedAt: null }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/auth/users/:id
// @desc    Update user details including Quota, SMTP, and Status (Admin only)
router.put('/users/:id', auth, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  const { dailyQuota, smtpConfig, status } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (dailyQuota !== undefined) {
      user.dailyQuota = parseInt(dailyQuota);
    }
    
    if (status) {
        user.status = status;
    }

    if (smtpConfig) {
      // Encrypt password if it's being updated
      const passwordToSave = smtpConfig.pass ? encrypt(smtpConfig.pass) : user.smtpConfig.pass;

      user.smtpConfig = {
        host: smtpConfig.host || user.smtpConfig.host,
        port: smtpConfig.port || user.smtpConfig.port,
        user: smtpConfig.user || user.smtpConfig.user,
        pass: passwordToSave,
        fromEmail: smtpConfig.fromEmail || user.smtpConfig.fromEmail,
      };
    }

    await user.save();
    
    // Return updated user
    const updatedUser = await User.findById(req.params.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/auth/users/:id
// @desc    Soft delete user (Admin only)
router.delete('/users/:id', auth, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ msg: 'Access denied' });
  }
  try {
    // Soft Delete: Update deletedAt instead of removing document
    await User.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ msg: 'User deactivated' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/auth/smtp
// @desc    Update SMTP settings (For logged in user to update their own)
router.put('/smtp', auth, async (req, res) => {
  const { host, port, user, pass, fromEmail } = req.body;
  try {
    const userDoc = await User.findById(req.user.id);
    if (!userDoc || userDoc.deletedAt) return res.status(404).json({ msg: 'User not found' });
    
    // Encrypt password before saving
    const encryptedPass = encrypt(pass);

    userDoc.smtpConfig = { host, port, user, pass: encryptedPass, fromEmail };
    await userDoc.save();
    
    // Return config (decrypted so UI remains consistent)
    res.json({ ...userDoc.smtpConfig, pass: pass });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth/smtp/test
// @desc    Test SMTP Connection
router.post('/smtp/test', auth, async (req, res) => {
    const { host, port, user, pass } = req.body;
    try {
        // Here we use the password provided in the request body (plaintext from UI input)
        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(port),
            secure: parseInt(port) === 465,
            auth: { user, pass }
        });

        await transporter.verify();
        res.json({ msg: 'Connection Successful' });
    } catch (err) {
        res.status(400).json({ msg: 'Connection Failed: ' + err.message });
    }
});

module.exports = router;
