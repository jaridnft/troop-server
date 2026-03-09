const express = require('express');
const { checkLicense } = require('../controllers/license');

const router = express.Router();

router.get('/', checkLicense);

module.exports = router;
