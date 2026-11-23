const pool = require('../config/database');

/**
 * Comment Model
 * comments 테이블 및 posts.comment_count 동기화 모듈
 */
const commentModel = {
  /**
   * 특정 게시글의 전체 댓글 목록 조회 및 2계층 트리(원댓글 + 대댓글)로 구조화
   * @param {number} postId
   */
  async getCommentsByPostId(postId) {
    const query = `
      SELECT 
        c.id, c.post_id, c.user_id, c.parent_id, c.content, c.is_deleted,
        c.created_at, c.updated_at,
        u.nickname AS author_nickname, u.profile_image AS author_profile, u.role AS author_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `;
    const [rows] = await pool.query(query, [postId]);

    // 계층형 트리 구성 (원댓글: parent_id === null, 대댓글: 원댓글의 replies에 push)
    const commentMap = new Map();
    const rootComments = [];

    // 1단계: 모든 댓글 맵에 등록 (replies 배열 초기화)
    rows.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    // 2단계: 부모-자식 관계 연결
    rows.forEach(comment => {
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        commentMap.get(comment.parent_id).replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    });

    // 3단계: 만약 원댓글이 삭제되었는데(is_deleted === 1) 대댓글도 하나도 없다면 화면에서 제외하거나 표시
    // (대댓글이 1개 이상 남아있는 삭제된 원댓글은 '삭제된 댓글입니다'로 유지)
    return rootComments;
  },

  /**
   * 댓글 단건 조회
   */
  async getCommentById(id) {
    const query = `
      SELECT c.*, u.nickname AS author_nickname, u.role AS author_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  },

  /**
   * 댓글/대댓글 신규 작성 (트랜잭션으로 comment_count 동기화)
   */
  async createComment({ post_id, user_id, parent_id = null, content }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. 댓글 삽입
      const insertQuery = `
        INSERT INTO comments (post_id, user_id, parent_id, content)
        VALUES (?, ?, ?, ?)
      `;
      const [insertResult] = await connection.query(insertQuery, [
        post_id,
        user_id,
        parent_id || null,
        content
      ]);

      // 2. posts 테이블의 comment_count 실제 개수로 갱신 (소프트 삭제되지 않은 활성 댓글 수)
      const countQuery = `
        UPDATE posts
        SET comment_count = (
          SELECT COUNT(*) FROM comments WHERE post_id = ? AND is_deleted = 0
        )
        WHERE id = ?
      `;
      await connection.query(countQuery, [post_id, post_id]);

      await connection.commit();
      return insertResult.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * 댓글 수정
   */
  async updateComment(id, content) {
    const query = `
      UPDATE comments
      SET content = ?
      WHERE id = ? AND is_deleted = 0
    `;
    const [result] = await pool.query(query, [content, id]);
    return result.affectedRows > 0;
  },

  /**
   * 댓글 소프트 삭제 (is_deleted = 1로 변경하여 대댓글 보존)
   */
  async softDeleteComment(id, postId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. is_deleted 플래그를 1로 변경
      const deleteQuery = `
        UPDATE comments
        SET is_deleted = 1, content = '삭제된 댓글입니다.'
        WHERE id = ?
      `;
      const [updateResult] = await connection.query(deleteQuery, [id]);

      // 2. posts 테이블의 comment_count 동기화
      const countQuery = `
        UPDATE posts
        SET comment_count = (
          SELECT COUNT(*) FROM comments WHERE post_id = ? AND is_deleted = 0
        )
        WHERE id = ?
      `;
      await connection.query(countQuery, [postId, postId]);

      await connection.commit();
      return updateResult.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * [신규] 특정 사용자가 작성한 활성 댓글 목록 조회 (마이페이지용)
   */
  async getCommentsByUserId(userId, limit = 20) {
    const query = `
      SELECT 
        c.id, c.post_id, c.content, c.created_at,
        p.title AS post_title,
        g.name AS game_name, g.slug AS game_slug
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      LEFT JOIN games g ON p.game_id = g.id
      WHERE c.user_id = ? AND c.is_deleted = 0
      ORDER BY c.created_at DESC
      LIMIT ?
    `;
    const [rows] = await pool.query(query, [userId, limit]);
    return rows;
  }
};

module.exports = commentModel;
