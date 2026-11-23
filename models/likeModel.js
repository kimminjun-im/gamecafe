const pool = require('../config/database');

/**
 * Like Model
 * post_likes 테이블 및 posts.like_count 동기화 모듈
 */
const likeModel = {
  /**
   * 특정 사용자가 특정 게시글에 좋아요를 눌렀는지 확인
   * @param {number} postId
   * @param {number} userId
   * @returns {Promise<boolean>}
   */
  async isPostLikedByUser(postId, userId) {
    if (!userId) return false;
    const query = `
      SELECT id FROM post_likes
      WHERE post_id = ? AND user_id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [postId, userId]);
    return rows.length > 0;
  },

  /**
   * 좋아요 토글 (누른 상태면 취소, 안 누른 상태면 추가)
   * 트랜잭션으로 posts.like_count를 실제 post_likes COUNT 결과로 100% 일치 동기화
   * @param {number} postId
   * @param {number} userId
   * @returns {Promise<{ liked: boolean, likeCount: number }>}
   */
  async togglePostLike(postId, userId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. 현재 추천 여부 확인
      const checkQuery = `
        SELECT id FROM post_likes
        WHERE post_id = ? AND user_id = ?
        LIMIT 1
      `;
      const [existing] = await connection.query(checkQuery, [postId, userId]);

      let liked = false;

      if (existing.length > 0) {
        // 이미 눌렀다면 -> 좋아요 취소 (DELETE)
        await connection.query(
          `DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`,
          [postId, userId]
        );
        liked = false;
      } else {
        // 아직 안 눌렀다면 -> 좋아요 추가 (INSERT)
        await connection.query(
          `INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)`,
          [postId, userId]
        );
        liked = true;
      }

      // 2. posts.like_count를 실제 post_likes 테이블의 COUNT(*) 결과로 즉시 갱신
      await connection.query(
        `UPDATE posts 
         SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = ?) 
         WHERE id = ?`,
        [postId, postId]
      );

      // 3. 최신 좋아요 수 조회
      const [postRow] = await connection.query(
        `SELECT like_count FROM posts WHERE id = ?`,
        [postId]
      );

      await connection.commit();

      const likeCount = postRow[0] ? postRow[0].like_count : 0;
      return { liked, likeCount };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = likeModel;
