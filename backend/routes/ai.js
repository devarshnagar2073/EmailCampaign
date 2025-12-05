
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { GoogleGenAI } = require("@google/genai");

// Helper to init AI
const getAI = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY not configured on server");
    return new GoogleGenAI({ apiKey });
};

// @route   POST api/ai/generate
// @desc    Generate email content (Subject + Body)
router.post('/generate', auth, async (req, res) => {
    const { topic, tone } = req.body;
    
    try {
        const ai = getAI();
        const prompt = `Write an email about: "${topic}". 
        Tone: ${tone || 'Professional'}. 
        Return the response in JSON format with two keys: "subject" (the email subject line) and "body" (the email body in HTML format).
        The HTML body should use <p>, <br>, <strong>, <ul>, <li> tags for structure.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                systemInstruction: "You are a world-class email marketing copywriter. Your goal is to write high-converting, engaging, and professional emails."
            }
        });

        const text = response.text || '{}';
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            json = { subject: "Generated Email", body: text };
        }
        
        res.json(json);

    } catch (err) {
        console.error("AI Generate Error:", err);
        res.status(500).json({ msg: 'Failed to generate content' });
    }
});

// @route   POST api/ai/analyze
// @desc    Analyze logs
router.post('/analyze', auth, async (req, res) => {
    const { logs } = req.body;
    
    try {
        const ai = getAI();
        const stats = {
            total: logs.length,
            failed: logs.filter(l => l.status === 'FAILED').length,
            sent: logs.filter(l => l.status === 'SENT').length
        };

        const prompt = `Analyze these email campaign stats: ${JSON.stringify(stats)}. Give me 2 short sentences of strategic advice to improve deliverability or engagement.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        res.json({ analysis: response.text || '' });

    } catch (err) {
        console.error("AI Analyze Error:", err);
        res.status(500).json({ msg: 'Failed to analyze logs' });
    }
});

module.exports = router;