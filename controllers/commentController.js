const commentModel = require('../models/commentModel');

const commentController = {
  /**
   * POST /api/comments
   * 댓글 또는 대댓글 작성
   */
  async create(req, res) {
    if (!req.session.user) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }
      return res.redirect('/auth/login');
    }

    const { post_id, parent_id, content } = req.body;
    const trimmedContent = (content || '').trim();

    if (!post_id || !trimmedContent) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(400).json({ success: false, message: '댓글 내용을 입력해 주세요.' });
      }
      return res.redirect(`/posts/${post_id}`);
    }

    try {
      const parsedParentId = parent_id ? parseInt(parent_id, 10) : null;
      const newCommentId = await commentModel.createComment({
        post_id: parseInt(post_id, 10),
        user_id: req.session.user.id,
        parent_id: parsedParentId,
        content: trimmedContent
      });

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, commentId: newCommentId });
      }
      return res.redirect(`/posts/${post_id}#comment-${newCommentId}`);
    } catch (error) {
      console.error('댓글 작성 처리 오류:', error);
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, message: '댓글 저장 중 오류가 발생했습니다.' });
      }
      return res.redirect(`/posts/${post_id}`);
    }
  },

  /**
   * POST /api/comments/:id/edit
   * 댓글 내용 수정 (작성자 본인만 가능)
   */
  async update(req, res) {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    const { id } = req.params;
    const { content } = req.body;
    const trimmedContent = (content || '').trim();

    if (!trimmedContent) {
      return res.status(400).json({ success: false, message: '수정할 댓글 내용을 입력해 주세요.' });
    }

    try {
      const comment = await commentModel.getCommentById(id);
      if (!comment) {
        return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
      }

      // 본인 작성 댓글만 수정 가능
      if (comment.user_id !== req.session.user.id) {
        return res.status(403).json({ success: false, message: '댓글 수정 권한이 없습니다.' });
      }

      if (comment.is_deleted) {
        return res.status(400).json({ success: false, message: '삭제된 댓글은 수정할 수 없습니다.' });
      }

      await commentModel.updateComment(id, trimmedContent);
      return res.json({ success: true, content: trimmedContent });
    } catch (error) {
      console.error('댓글 수정 처리 오류:', error);
      return res.status(500).json({ success: false, message: '댓글 수정 중 시스템 오류가 발생했습니다.' });
    }
  },

  /**
   * POST /api/comments/:id/delete
   * 댓글 소프트 삭제 (is_deleted = 1, 대댓글 보존)
   */
  async delete(req, res) {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    const { id } = req.params;

    try {
      const comment = await commentModel.getCommentById(id);
      if (!comment) {
        return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
      }

      // 작성자 본인 또는 관리자만 삭제 가능
      const isAuthorized = req.session.user.id === comment.user_id || req.session.user.role === 'admin';
      if (!isAuthorized) {
        return res.status(403).json({ success: false, message: '댓글 삭제 권한이 없습니다.' });
      }

      await commentModel.softDeleteComment(id, comment.post_id);

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({ success: true });
      }
      return res.redirect(`/posts/${comment.post_id}`);
    } catch (error) {
      console.error('댓글 삭제 처리 오류:', error);
      return res.status(500).json({ success: false, message: '댓글 삭제 중 오류가 발생했습니다.' });
    }
  }
};

module.exports = commentController;
