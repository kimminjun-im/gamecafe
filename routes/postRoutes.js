const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// 1. 게임별 게시판 목록
router.get('/games/:gameSlug', postController.list);

// 2. 게시글 작성
router.get('/games/:gameSlug/write', isAuthenticated, postController.getWrite);
router.post('/games/:gameSlug/write', isAuthenticated, postController.postWrite);

// 3. 게시글 상세 보기
router.get('/posts/:id', postController.detail);

// 4. 게시글 수정
router.get('/posts/:id/edit', isAuthenticated, postController.getEdit);
router.post('/posts/:id/edit', isAuthenticated, postController.postEdit);

// 5. 게시글 삭제
router.post('/posts/:id/delete', isAuthenticated, postController.delete);

module.exports = router;
