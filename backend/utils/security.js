
const crypto = require('crypto');

// Determine key from secret or default
const SECRET = process.env.JWT_SECRET || 'default_secret_key_minimum_32_bytes_long_string';
// Create a 32-byte key
const key = crypto.createHash('sha256').update(String(SECRET)).digest('base64').substr(0, 32);
const algorithm = 'aes-256-ctr';

const encrypt = (text) => {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (e) {
        console.error("Encryption error", e);
        return text;
    }
};

const decrypt = (hash) => {
    if (!hash || !hash.includes(':')) return hash;
    try {
        const parts = hash.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = Buffer.from(parts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        console.error("Decryption error", e);
        return hash;
    }
};

module.exports = { encrypt, decrypt };
