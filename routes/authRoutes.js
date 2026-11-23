const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isGuest } = require('../middlewares/authMiddleware');

// 회원가입 페이지 (로그인 안 한 사용자만 접근 가능)
router.get('/register', isGuest, authController.getRegister);
router.post('/register', isGuest, authController.postRegister);

// 로그인 페이지 (로그인 안 한 사용자만 접근 가능)
router.get('/login', isGuest, authController.getLogin);
router.post('/login', isGuest, authController.postLogin);

// 로그아웃
router.get('/logout', authController.logout);

module.exports = router;
