
const nodemailer = require('nodemailer');
const fs = require('fs');
const csv = require('csv-parser');
const EmailLog = require('../models/EmailLog');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const Template = require('../models/Template');
const { decrypt } = require('./security');
const sanitizeHtml = require('sanitize-html');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BATCH_SIZE = 50; // Fetch 50 contacts at a time from DB
const SLEEP_MS = 2000; // Delay between batches to respect rate limits

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const checkQuota = async (user, amount) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const lastSent = new Date(user.lastSentDate || 0);
    lastSent.setHours(0,0,0,0);

    if (today > lastSent) {
        user.emailsSentToday = 0;
        user.lastSentDate = Date.now();
        await user.save();
    }

    if ((user.emailsSentToday + amount) > user.dailyQuota) {
        return false;
    }
    return true;
};

// Helper to escape CSV data to prevent injection when replacing
const escapeHtml = (unsafe) => {
    if (unsafe === undefined || unsafe === null) return '';
    if (typeof unsafe !== 'string') return String(unsafe);
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

// Helper: Send with Retry logic for transient SMTP errors
const sendWithRetry = async (transporter, mailOptions, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            await transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            // If it's the last attempt, throw
            if (i === retries - 1) throw error;
            
            // Retry only on specific errors (timeouts, connection issues, greylisting 4xx)
            const isTransient = 
                (error.responseCode && error.responseCode >= 400 && error.responseCode < 500) ||
                error.code === 'ETIMEDOUT' || 
                error.code === 'ECONNRESET' ||
                error.code === 'ESOCKET' ||
                error.command === 'CONN';

            if (isTransient) {
                console.log(`Transient error sending to ${mailOptions.to}, retrying (${i+1}/${retries})...`);
                await sleep(3000 * (i + 1)); // Exponential backoff
            } else {
                throw error; // Fatal error (Auth failed, 5xx), do not retry
            }
        }
    }
};

// Helper to ingest CSV to DB with Streaming and Batching
const ingestContacts = async (campaign) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(campaign.csvPath)) {
            return reject(new Error("CSV file not found on server"));
        }

        let buffer = [];
        const INSERT_BATCH_SIZE = 500; // Batch insert size for MongoDB
        let totalIngested = 0;
        const emailCol = campaign.emailColumn || 'email';

        const stream = fs.createReadStream(campaign.csvPath).pipe(csv());

        stream.on('data', async (data) => {
            // Find email (case insensitive search for column)
            let email = data[emailCol];
            if (!email) {
                const key = Object.keys(data).find(k => k.toLowerCase() === emailCol.toLowerCase());
                if(key) email = data[key];
            }

            if(email && typeof email === 'string' && emailRegex.test(email.trim())) {
                buffer.push({
                    campaignId: campaign._id,
                    email: email.trim(),
                    data: data, // Store raw row data for variable mapping
                    status: 'PENDING'
                });
            }

            // When buffer is full, pause stream and insert
            if (buffer.length >= INSERT_BATCH_SIZE) {
                stream.pause();
                const chunk = [...buffer];
                buffer = [];
                try {
                    await Contact.insertMany(chunk);
                    totalIngested += chunk.length;
                    stream.resume();
                } catch (e) {
                    stream.destroy(e);
                }
            }
        });

        stream.on('end', async () => {
            try {
                // Insert remaining items
                if (buffer.length > 0) {
                    await Contact.insertMany(buffer);
                    totalIngested += buffer.length;
                }
                campaign.ingested = true;
                campaign.totalContacts = totalIngested;
                await campaign.save();
                resolve(totalIngested);
            } catch (e) {
                reject(e);
            }
        });

        stream.on('error', (err) => reject(err));
    });
};

const processCampaign = async (campaignId, userId, launchConfig, attachmentFiles = []) => {
    let transporter = null;
    try {
        let campaign = await Campaign.findById(campaignId);
        if(!campaign) throw new Error('Campaign not found');

        // CRITICAL FIX: Fallback to DB launchConfig if argument is missing/empty (common in retries)
        if (!launchConfig || !launchConfig.body) {
            launchConfig = campaign.launchConfig;
        }

        // FALLBACK: If body is STILL missing, try to fetch from assigned Template
        if ((!launchConfig || !launchConfig.body) && campaign.templateId) {
             const tmpl = await Template.findById(campaign.templateId);
             if (tmpl) {
                 console.log(`Fallback: Using content from Template ${campaign.templateId}`);
                 launchConfig = { 
                     ...launchConfig, 
                     subject: tmpl.subject, 
                     body: tmpl.body 
                 };
                 // Save this fallback config to campaign so next time it's faster
                 campaign.launchConfig = { ...campaign.launchConfig, subject: tmpl.subject, body: tmpl.body };
                 await campaign.save();
             }
        }

        // SAFETY: If we still don't have a body, we cannot proceed.
        if (!launchConfig || !launchConfig.body) {
            throw new Error('Campaign configuration is missing email body content. Cannot send blank emails.');
        }

        const user = await User.findById(userId);
        if (!user.smtpConfig || !user.smtpConfig.host) {
            throw new Error('SMTP Config missing');
        }

        // 1. Ingestion Phase
        if (!campaign.ingested) {
            await ingestContacts(campaign);
            campaign = await Campaign.findById(campaignId); 
        }

        // 2. Count Pending
        const pendingCount = await Contact.countDocuments({ campaignId: campaign._id, status: 'PENDING' });
        
        // Quota Check
        if (!(await checkQuota(user, pendingCount > 0 ? 1 : 0))) { 
             if(user.emailsSentToday >= user.dailyQuota) {
                campaign.status = 'FAILED';
                await campaign.save();
                throw new Error(`Daily quota reached.`);
             }
        }

        // Update Status
        campaign.status = 'PROCESSING';
        await campaign.save();

        // Prepare Transport
        const decryptedPass = decrypt(user.smtpConfig.pass);
        const port = parseInt(user.smtpConfig.port);
        const secure = port === 465;

        transporter = nodemailer.createTransport({
            pool: true,
            host: user.smtpConfig.host,
            port: port,
            secure: secure, 
            auth: { user: user.smtpConfig.user, pass: decryptedPass },
            name: user.smtpConfig.host,
            maxConnections: 1, 
            maxMessages: 20,   
            socketTimeout: 60000, 
            connectionTimeout: 20000,
            greetingTimeout: 20000,
            tls: {
                rejectUnauthorized: false,
                minVersion: 'TLSv1.2'
            }
        });

        await transporter.verify();

        // Prepare Attachments
        let mailAttachments = [];
        if (attachmentFiles && attachmentFiles.length > 0) {
            mailAttachments = attachmentFiles.map(f => ({
                filename: f.originalname || f.filename,
                path: f.path
            }));
        } else if (launchConfig.attachments && launchConfig.attachments.length > 0) {
            mailAttachments = launchConfig.attachments.map(f => ({
                filename: f.filename,
                path: f.path
            }));
        }

        const cleanBodyTemplate = sanitizeHtml(launchConfig.body || '', {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img', 'h1', 'h2', 'span', 'div', 'style', 'br', 'p', 'b', 'i', 'strong', 'em', 'ul', 'li', 'a', 'table', 'tbody', 'tr', 'td', 'th', 'center', 'font' ]),
            allowedAttributes: {
                ...sanitizeHtml.defaults.allowedAttributes,
                '*': ['style', 'class', 'width', 'height', 'align', 'valign', 'bgcolor', 'border'],
                'img': ['src', 'alt', 'width', 'height'],
                'a': ['href', 'target']
            }
        });

        if (!cleanBodyTemplate) {
            throw new Error("Sanitized email body is empty. Please check your HTML content.");
        }

        const baseUrl = process.env.BASE_URL || 'http://localhost:5000'; 
        let sentCount = campaign.sentCount;
        let failedCount = campaign.failedCount;

        let consecutiveFailures = 0;
        const MAX_CONSECUTIVE_FAILURES = 10;

        // 3. Processing Loop (Batching)
        while (true) {
            // Check for External Abort
            const freshCampaign = await Campaign.findById(campaignId).select('status');
            if (!freshCampaign || freshCampaign.status === 'ABORTED' || freshCampaign.status === 'FAILED' || freshCampaign.status === 'COMPLETED') {
                 console.log(`Campaign ${campaignId} stopped/aborted.`);
                 return { sent: sentCount, failed: failedCount, aborted: true };
            }

            if (user.emailsSentToday >= user.dailyQuota) {
                console.log("Quota reached during processing.");
                break;
            }

            const batch = await Contact.find({ campaignId: campaign._id, status: 'PENDING' }).limit(BATCH_SIZE);
            if (batch.length === 0) break;

            for (let i = 0; i < batch.length; i++) {
                
                if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                    campaign.status = 'FAILED';
                    await campaign.save();
                    if (transporter) transporter.close();
                    return { sent: sentCount, failed: failedCount, aborted: true };
                }

                if (user.emailsSentToday >= user.dailyQuota) break;

                const contact = batch[i];
                
                try {
                    const logEntry = await EmailLog.create({
                        userId,
                        recipient: contact.email,
                        status: 'PENDING',
                        campaignName: campaign.name
                    });

                    let emailBody = cleanBodyTemplate || '';
                    let emailSubject = launchConfig.subject || '';

                    const rowData = contact.data ? Object.fromEntries(contact.data) : {};
                    const context = { ...rowData, email: contact.email };

                    if (campaign.fieldMapping) {
                        for (const [sysKey, csvHeader] of campaign.fieldMapping.entries()) {
                            if (rowData[csvHeader] !== undefined) {
                                context[sysKey] = rowData[csvHeader];
                            }
                        }
                    }

                    for(const key in context) {
                        const placeholder = `{{${key}}}`;
                        const safeValue = escapeHtml(context[key]);
                        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const re = new RegExp(`{{${escapedKey}}}`, 'g');
                        
                        if (emailBody) emailBody = emailBody.replace(re, safeValue);
                        if (emailSubject) emailSubject = emailSubject.replace(re, safeValue);
                    }

                    if (launchConfig.trackClicks) {
                            const trackingBase = `${baseUrl}/api/campaign/click/${logEntry._id}?url=`;
                            const linkRegex = /href=(["'])(https?:\/\/[^"']+)\1/g;
                            if (emailBody) {
                                emailBody = emailBody.replace(linkRegex, (match, quote, url) => {
                                    return `href=${quote}${trackingBase}${encodeURIComponent(url)}${quote}`;
                                });
                            }
                    }

                    if (launchConfig.trackOpens) {
                        const trackingUrl = `${baseUrl}/api/campaign/track/${logEntry._id}`;
                        const pixelHtml = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none;" />`;
                        if (emailBody && emailBody.includes('</body>')) {
                            emailBody = emailBody.replace('</body>', `${pixelHtml}</body>`);
                        } else {
                            emailBody += pixelHtml;
                        }
                    }

                    await sendWithRetry(transporter, {
                        from: user.smtpConfig.fromEmail,
                        to: contact.email,
                        subject: emailSubject,
                        html: emailBody,
                        attachments: mailAttachments
                    });

                    contact.status = 'SENT';
                    await contact.save();

                    logEntry.status = 'SENT';
                    await logEntry.save();
                    
                    consecutiveFailures = 0;
                    sentCount++;
                    
                    await User.findByIdAndUpdate(userId, { 
                        $inc: { emailsSentToday: 1 },
                        lastSentDate: Date.now()
                    });
                    user.emailsSentToday += 1;

                } catch (error) {
                    console.error(`Error sending to ${contact.email}:`, error.message);
                    
                    contact.status = 'FAILED';
                    contact.errorMessage = error.message;
                    await contact.save();

                    await EmailLog.create({
                        userId,
                        recipient: contact.email,
                        status: 'FAILED',
                        errorMessage: error.message,
                        campaignName: campaign.name
                    });

                    consecutiveFailures++;
                    failedCount++;
                }

                // Update Progress periodically
                await Campaign.findByIdAndUpdate(campaignId, { sentCount, failedCount });
                await sleep(SLEEP_MS);
            }
        }

        const remaining = await Contact.countDocuments({ campaignId: campaign._id, status: 'PENDING' });
        // Fetch fresh campaign status to check for aborts one last time
        const finalCheck = await Campaign.findById(campaignId).select('status');
        
        if (finalCheck.status !== 'ABORTED' && finalCheck.status !== 'FAILED') {
            if (remaining === 0) {
                campaign.status = 'COMPLETED';
            } else {
                // If loop exited but items remain (e.g. quota), mark as failed or just leave partial
                campaign.status = 'FAILED'; 
            }
            campaign.sentCount = sentCount;
            campaign.failedCount = failedCount;
            await campaign.save();
        }

        return { sent: sentCount, failed: failedCount };

    } catch (error) {
        console.error("Campaign Process Error:", error);
        const c = await Campaign.findById(campaignId);
        if (c && c.status !== 'ABORTED') {
            c.status = 'FAILED';
            await c.save();
        }
        throw error;
    } finally {
        if (transporter) {
            transporter.close();
        }
    }
};

module.exports = { processCampaign };
