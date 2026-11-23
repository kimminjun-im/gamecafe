const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const likeController = require('../controllers/likeController');

// 1. 댓글 및 대댓글 관련 API
router.post('/comments', commentController.create);
router.post('/comments/:id/edit', commentController.update);
router.post('/comments/:id/delete', commentController.delete);

// 2. 게시글 좋아요 비동기 토글 API
router.post('/posts/:id/like', likeController.toggleLike);

module.exports = router;
