
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Template = require('../models/Template');

// @route   GET api/templates
// @desc    Get all templates for user
router.get('/', auth, async (req, res) => {
  try {
    const templates = await Template.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   POST api/templates
// @desc    Create a new template
router.post('/', auth, async (req, res) => {
  const { name, subject, body } = req.body;
  try {
    const newTemplate = new Template({
      userId: req.user.id,
      name,
      subject,
      body
    });
    const template = await newTemplate.save();
    res.json(template);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/templates/:id
// @desc    Delete a template
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ msg: 'Template not found' });
    
    // Ensure user owns template
    if (template.userId.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'Not authorized' });
    }

    await Template.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Template removed' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
