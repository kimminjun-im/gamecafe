const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middlewares/authMiddleware');

// 모든 관리자 라우트에 관리자 권한 검사 미들웨어 강제 적용
router.use(isAdmin);

// 1. 대시보드
router.get('/', adminController.dashboard);
router.get('/dashboard', adminController.dashboard);

// 2. 회원 관리
router.get('/users', adminController.userList);
router.post('/users/:id/ban', adminController.toggleBan);
router.post('/users/:id/role', adminController.changeRole);

// 3. 게시글 관리
router.get('/posts', adminController.postList);
router.post('/posts/:id/delete', adminController.deletePost);

// 4. 공지사항 관리
router.get('/notices', adminController.noticeList);
router.post('/notices/create', adminController.createNotice);

module.exports = router;
