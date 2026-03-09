const express = require('express');
const { receiveData } = require('../controllers/data');
const { shopifyCorsOnly } = require('../middleware/shopifyCors');

const router = express.Router();

router.options('/', shopifyCorsOnly);
router.post('/', shopifyCorsOnly, receiveData);

module.exports = router;
