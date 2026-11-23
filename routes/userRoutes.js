const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { uploadProfile } = require('../middlewares/uploadMiddleware');

// 마이페이지 (로그인 필수)
router.get('/profile', isAuthenticated, userController.getMyProfile);

// 프로필 수정 (이미지 파일 업로드 지원)
router.post('/profile/edit', isAuthenticated, uploadProfile.single('profile_image'), userController.updateProfile);

// 다른 사용자 공개 프로필 조회
router.get('/users/:id', userController.getUserProfile);

module.exports = router;
