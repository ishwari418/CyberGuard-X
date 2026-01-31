import express from 'express';
import {
    checkPhishing, analyzeUrl, analyzeQr,
    checkPhoneNumber, getCallLogs,
    scanFile,
    getVaultItems, addToVault, deleteVaultItem,
    reportIncident, getIncidents,
    chatWithAI
} from '../controllers/feature.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// Phishing
router.post('/phishing/analyze/text', checkPhishing);
router.post('/phishing/analyze/url', analyzeUrl);

// QR
router.post('/qr/decode', analyzeQr);

// Voice Shield
router.post('/voice/check-number', checkPhoneNumber);
router.get('/voice/logs', getCallLogs);

// App Sentinel
router.post('/app-sentinel/scan-file', scanFile);

// Secure Vault
router.get('/vault/items', getVaultItems);
router.post('/vault/upload', addToVault);
router.delete('/vault/items/:id', deleteVaultItem);

// Incidents
router.get('/incidents', getIncidents);
router.post('/incidents', reportIncident);

// Chat
router.post('/chat', chatWithAI);

export default router;
