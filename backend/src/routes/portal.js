const express    = require('express');
const router     = express.Router();
const portalCtrl = require('../controllers/portalController');
const kbCtrl     = require('../controllers/kbController');
const verifyToken = require('../middleware/auth');

// ── Admin-only KB routes ──────────────────────────────────────────────────────
router.get('/knowledge/admin',           verifyToken, kbCtrl.adminList);
router.delete('/knowledge/:id',          verifyToken, kbCtrl.deleteDoc);
router.post('/knowledge/:id/embed',      verifyToken, kbCtrl.embedDoc);

// ── Public KB routes (no auth) ────────────────────────────────────────────────
// /search must be registered BEFORE /:id/versions to avoid param capture
router.get('/knowledge/search',          kbCtrl.search);
router.get('/knowledge',                 portalCtrl.getKnowledge);
router.get('/knowledge/:id/versions',    portalCtrl.getDocVersions);

// ── Auth-required KB upload ───────────────────────────────────────────────────
router.post('/knowledge/upload',
  verifyToken,
  kbCtrl.uploadMiddleware,
  kbCtrl.uploadDoc
);

// ── Auth-required app & personalisation routes ────────────────────────────────
router.get('/apps',         verifyToken, portalCtrl.getApps);
router.get('/favourites',   verifyToken, portalCtrl.getFavourites);
router.post('/favourites',  verifyToken, portalCtrl.toggleFavourite);
router.get('/pinned-docs',  verifyToken, portalCtrl.getPinnedDocs);
router.post('/pinned-docs', verifyToken, portalCtrl.togglePinnedDoc);

module.exports = router;
