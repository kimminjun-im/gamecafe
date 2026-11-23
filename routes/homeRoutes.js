const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// 메인 홈페이지
router.get('/', homeController.index);

module.exports = router;
