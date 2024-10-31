const express = require('express');
const router = express.Router();
const { handleAssistantRequest } = require('../controllers/assistantController');

router.post('/chat', handleAssistantRequest);

module.exports = router;
