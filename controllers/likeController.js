const likeModel = require('../models/likeModel');

const likeController = {
  /**
   * POST /api/posts/:id/like
   * 게시글 좋아요 토글 (AJAX 비동기 처리)
   */
  async toggleLike(req, res) {
    // 1. 비로그인 사용자 차단
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요한 기능입니다. 로그인 후 이용해 주세요.'
      });
    }

    const postId = parseInt(req.params.id, 10);
    if (!postId || isNaN(postId)) {
      return res.status(400).json({
        success: false,
        message: '잘못된 게시글 번호입니다.'
      });
    }

    try {
      // 2. 좋아요 토글 및 트랜잭션 동기화
      const result = await likeModel.togglePostLike(postId, req.session.user.id);

      return res.json({
        success: true,
        liked: result.liked,
        likeCount: result.likeCount,
        message: result.liked ? '게시글을 추천했습니다.' : '추천을 취소했습니다.'
      });
    } catch (error) {
      console.error('좋아요 토글 처리 오류:', error);
      return res.status(500).json({
        success: false,
        message: '좋아요 처리 중 데이터베이스 오류가 발생했습니다.'
      });
    }
  }
};

module.exports = likeController;
