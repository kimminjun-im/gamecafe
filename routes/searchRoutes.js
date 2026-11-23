const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// 통합 검색
router.get('/', searchController.search);

module.exports = router;
