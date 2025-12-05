
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const mongoose = require('mongoose');
const EmailLog = require('../models/EmailLog');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const { processCampaign } = require('../utils/emailSender');
const nodemailer = require('nodemailer');
const { decrypt } = require('../utils/security');
const sanitizeHtml = require('sanitize-html');

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, uniqueSuffix + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });
const cpUpload = upload.fields([{ name: 'file', maxCount: 1 }, { name: 'attachments', maxCount: 5 }]);

// --- Routes ---

// @route   POST api/campaign/quick-send
router.post('/quick-send', auth, async (req, res) => {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
        return res.status(400).json({ msg: 'Please provide To, Subject, and Body.' });
    }

    try {
        const user = await User.findById(req.user.id);
        
        if (!user.smtpConfig || !user.smtpConfig.host) {
            return res.status(400).json({ msg: 'SMTP Configuration missing. Please go to Settings.' });
        }

        const today = new Date();
        today.setHours(0,0,0,0);
        const lastSent = new Date(user.lastSentDate || 0);
        lastSent.setHours(0,0,0,0);

        if (today > lastSent) {
            user.emailsSentToday = 0;
            user.lastSentDate = Date.now();
        }

        if (user.emailsSentToday >= user.dailyQuota) {
            return res.status(400).json({ msg: 'Daily email quota exceeded.' });
        }

        const decryptedPass = decrypt(user.smtpConfig.pass);
        const transporter = nodemailer.createTransport({
            host: user.smtpConfig.host,
            port: user.smtpConfig.port,
            secure: parseInt(user.smtpConfig.port) === 465, 
            auth: { user: user.smtpConfig.user, pass: decryptedPass },
        });

        const cleanBody = sanitizeHtml(body, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img', 'h1', 'h2', 'span', 'div', 'br', 'p', 'b', 'i', 'strong', 'em', 'ul', 'li', 'a' ]),
        });

        await transporter.sendMail({
            from: user.smtpConfig.fromEmail,
            to: to,
            subject: subject,
            html: cleanBody
        });

        await EmailLog.create({
            userId: user.id,
            recipient: to,
            status: 'SENT',
            campaignName: 'Quick Send',
            errorMessage: null
        });

        user.emailsSentToday += 1;
        user.lastSentDate = Date.now();
        await user.save();

        res.json({ msg: 'Email Sent Successfully' });

    } catch (error) {
        console.error("Quick Send Error:", error);
        
        await EmailLog.create({
            userId: req.user.id,
            recipient: to,
            status: 'FAILED',
            campaignName: 'Quick Send',
            errorMessage: error.message
        });

        res.status(500).json({ msg: 'Failed to send email: ' + error.message });
    }
});

// @route   GET api/campaign
router.get('/', auth, async (req, res) => {
    try {
        const campaigns = await Campaign.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(campaigns);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET api/campaign/:id/contacts
router.get('/:id/contacts', auth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if(!campaign) return res.status(404).json({msg: 'Campaign not found'});
        if(campaign.userId.toString() !== req.user.id) return res.status(401).json({msg: 'Not authorized'});

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search ? req.query.search.toLowerCase() : '';
        const skip = (page - 1) * limit;

        if (campaign.ingested) {
            const query = { campaignId: campaign._id };
            if (search) {
                query.email = { $regex: search, $options: 'i' };
            }

            const total = await Contact.countDocuments(query);
            const contactsDocs = await Contact.find(query)
                .skip(skip)
                .limit(limit)
                .lean();
            
            const contacts = contactsDocs.map(c => ({
                ...c.data, 
                email: c.email,
                _status: c.status
            }));

            return res.json({
                contacts,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            });
        }

        if (!fs.existsSync(campaign.csvPath)) {
            return res.status(404).json({ msg: 'CSV file not found' });
        }
        
        const results = [];
        let filteredCount = 0;
        const readStream = fs.createReadStream(campaign.csvPath).pipe(csv());

        for await (const row of readStream) {
            let matches = true;
            if (search) {
                matches = Object.values(row).some(val => 
                    String(val).toLowerCase().includes(search)
                );
            }

            if (matches) {
                if (filteredCount >= skip && filteredCount < skip + limit) {
                    results.push(row);
                }
                filteredCount++;
            }
        }

        res.json({
            contacts: results,
            total: filteredCount,
            page,
            limit,
            totalPages: Math.ceil(filteredCount / limit)
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/campaign/:id/logs
router.get('/:id/logs', auth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if(!campaign) return res.status(404).json({msg: 'Campaign not found'});
        if(campaign.userId.toString() !== req.user.id) return res.status(401).json({msg: 'Not authorized'});

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const query = { 
            userId: req.user.id, 
            campaignName: campaign.name,
            deletedAt: null 
        };

        const total = await EmailLog.countDocuments(query);
        const logs = await EmailLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/campaign/upload
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ msg: 'No CSV file uploaded' });
    const { name } = req.body;

    const results = [];
    const headers = [];
    
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('headers', (h) => headers.push(...h))
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                let emailCol = headers.find(h => h.toLowerCase().includes('email') || h.toLowerCase().includes('e-mail')) || '';

                const campaign = new Campaign({
                    userId: req.user.id,
                    name: name || req.file.originalname,
                    csvPath: req.file.path,
                    csvOriginalName: req.file.originalname,
                    totalContacts: results.length,
                    csvHeaders: headers,
                    emailColumn: emailCol,
                    ingested: false 
                });

                await campaign.save();
                res.json(campaign);
            } catch (e) {
                res.status(500).json({ msg: 'Failed to process CSV' });
            }
        });
});

// @route   PUT api/campaign/:id
router.put('/:id', auth, async (req, res) => {
    const { name, emailColumn, fieldMapping } = req.body;
    try {
        const campaign = await Campaign.findById(req.params.id);
        if(!campaign) return res.status(404).json({msg: 'Campaign not found'});
        if(campaign.userId.toString() !== req.user.id) return res.status(401).json({msg: 'Not authorized'});

        if(name) campaign.name = name;
        if(emailColumn) campaign.emailColumn = emailColumn;
        if(fieldMapping) campaign.fieldMapping = fieldMapping;
        
        await campaign.save();
        res.json(campaign);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/campaign/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if(!campaign) return res.status(404).json({msg: 'Campaign not found'});
        if(campaign.userId.toString() !== req.user.id) return res.status(401).json({msg: 'Not authorized'});

        if(fs.existsSync(campaign.csvPath)) {
            try { fs.unlinkSync(campaign.csvPath); } catch(e) {}
        }
        
        await Contact.deleteMany({ campaignId: campaign._id });

        await Campaign.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Campaign deleted' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/campaign/:id/launch
router.post('/:id/launch', auth, cpUpload, async (req, res) => {
    const campaignId = req.params.id;
    const { subject, body, trackOpens, trackClicks, scheduledAt, templateId } = req.body;
    const isTrackingOpens = trackOpens === 'true' || trackOpens === true;
    const isTrackingClicks = trackClicks === 'true' || trackClicks === true;
    
    const attachmentFiles = req.files && req.files['attachments'] ? req.files['attachments'] : [];

    try {
        const campaign = await Campaign.findById(campaignId);
        if(!campaign) return res.status(404).json({msg: 'Campaign not found'});
        if(campaign.userId.toString() !== req.user.id) return res.status(401).json({msg: 'Not authorized'});

        if (templateId) {
            campaign.templateId = templateId;
        }

        const launchConfig = {
            subject,
            body,
            trackOpens: isTrackingOpens,
            trackClicks: isTrackingClicks,
        };

        if (scheduledAt) {
            const date = new Date(scheduledAt);
            if (date > new Date()) {
                campaign.status = 'SCHEDULED';
                campaign.scheduledAt = date;
                campaign.launchConfig = {
                    ...launchConfig,
                    attachments: attachmentFiles.map(f => ({ filename: f.originalname, path: f.path }))
                };
                await campaign.save();
                return res.json({ msg: 'Campaign Scheduled Successfully', scheduledAt: date });
            }
        }

        campaign.launchConfig = {
             ...launchConfig,
             attachments: attachmentFiles.map(f => ({ filename: f.originalname, path: f.path }))
        };
        await campaign.save();

        res.json({ msg: 'Campaign launched', campaignId: campaign._id });

        // Trigger processing
        processCampaign(campaignId, req.user.id, launchConfig, attachmentFiles)
            .catch(err => console.error("Immediate launch error", err));

    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).send('Server Error');
    }
});

// @route   POST api/campaign/:id/retry
// @desc    Retry sending to FAILED/PENDING contacts
router.post('/:id/retry', auth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if(!campaign) return res.status(404).json({msg: 'Campaign not found'});
        if(campaign.userId.toString() !== req.user.id) return res.status(401).json({msg: 'Not authorized'});

        // Reset FAILED contacts to PENDING
        await Contact.updateMany(
            { campaignId: campaign._id, status: 'FAILED' }, 
            { status: 'PENDING', errorMessage: '' }
        );

        campaign.status = 'PROCESSING';
        await campaign.save();

        res.json({ msg: 'Campaign retry initiated' });

        // Pass NULL for config to force processCampaign to fetch it from DB safely
        processCampaign(campaign._id, req.user.id, null, [])
            .catch(err => console.error("Retry launch error", err));

    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/campaign/:id/abort
router.post('/:id/abort', auth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if(!campaign) return res.status(404).json({msg: 'Campaign not found'});
        if(campaign.userId.toString() !== req.user.id) return res.status(401).json({msg: 'Not authorized'});

        if (campaign.status === 'PROCESSING' || campaign.status === 'SCHEDULED') {
            campaign.status = 'ABORTED';
            await campaign.save();
        }
        res.json({ msg: 'Campaign aborted' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- Existing Tracking & Logs Routes ---

router.get('/track/:id', async (req, res) => {
    try {
        const logId = req.params.id;
        if (mongoose.Types.ObjectId.isValid(logId)) {
            await EmailLog.findByIdAndUpdate(logId, { opened: true });
        }
    } catch (e) {}
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': pixel.length, 'Cache-Control': 'no-cache' });
    res.end(pixel);
});

router.get('/click/:id', async (req, res) => {
    try {
        const logId = req.params.id;
        const targetUrl = req.query.url;
        
        if (targetUrl) {
             if (mongoose.Types.ObjectId.isValid(logId)) {
                await EmailLog.findByIdAndUpdate(logId, { clicked: true, opened: true }); // Click implies open
            }
            res.redirect(targetUrl);
        } else {
            res.status(400).send('Invalid URL');
        }
    } catch (e) {
        console.error(e);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/campaign/logs (Paginated)
router.get('/logs', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { userId: req.user.id, deletedAt: null };
    const total = await EmailLog.countDocuments(query);
    const logs = await EmailLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit);

    res.json({
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const history = await EmailLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id), deletedAt: null } },
      { $group: { _id: "$campaignName", sent: { $sum: { $cond: [{ $eq: ["$status", "SENT"] }, 1, 0] } }, opened: { $sum: { $cond: [{ $eq: ["$opened", true] }, 1, 0] } }, lastSent: { $max: "$timestamp" } } },
      { $sort: { lastSent: -1 } },
      { $limit: 10 }
    ]);
    res.json(history);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.post('/logs/delete-bulk', auth, async (req, res) => {
  try {
    await EmailLog.updateMany({ _id: { $in: req.body.ids }, userId: req.user.id }, { deletedAt: new Date() });
    res.json({ msg: 'Logs deleted' });
  } catch (err) { res.status(500).send('Server Error'); }
});

router.post('/logs/review-bulk', auth, async (req, res) => {
  try {
    await EmailLog.updateMany({ _id: { $in: req.body.ids }, userId: req.user.id }, { isReviewed: true });
    res.json({ msg: 'Logs marked as reviewed' });
  } catch (err) { res.status(500).send('Server Error'); }
});

router.get('/all-logs', auth, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ msg: 'Access denied' });
    try {
      const logs = await EmailLog.find({ deletedAt: null }).sort({ timestamp: -1 });
      res.json(logs);
    } catch (err) { res.status(500).send('Server Error'); }
});

// --- Background Job for Scheduled Campaigns ---
setInterval(async () => {
    try {
        const now = new Date();
        const dueCampaigns = await Campaign.find({
            status: 'SCHEDULED',
            scheduledAt: { $lte: now }
        });

        for (const campaign of dueCampaigns) {
            console.log(`Executing scheduled campaign: ${campaign.name}`);
            // Pass null for config to force safe fetch from DB
            await processCampaign(campaign._id, campaign.userId, null, []);
        }
    } catch (error) {
        console.error("Scheduler Error:", error);
    }
}, 60000); 

module.exports = router;
