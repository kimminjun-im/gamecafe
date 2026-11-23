const pool = require('../config/database');

/**
 * User Model
 * users 테이블 관련 데이터베이스 모듈
 */
const userModel = {
  /**
   * 이메일로 사용자 조회
   */
  async findByEmail(email) {
    const query = `
      SELECT id, email, password, nickname, profile_image, bio, role, COALESCE(is_banned, 0) AS is_banned, created_at
      FROM users
      WHERE email = ?
    `;
    const [rows] = await pool.query(query, [email]);
    return rows[0] || null;
  },

  /**
   * 닉네임으로 사용자 조회
   */
  async findByNickname(nickname) {
    const query = `
      SELECT id, email, nickname, profile_image, bio, role, COALESCE(is_banned, 0) AS is_banned, created_at
      FROM users
      WHERE nickname = ?
    `;
    const [rows] = await pool.query(query, [nickname]);
    return rows[0] || null;
  },

  /**
   * 고유 ID로 사용자 조회 (비밀번호 제외)
   */
  async findById(id) {
    const query = `
      SELECT id, email, nickname, profile_image, bio, role, COALESCE(is_banned, 0) AS is_banned, created_at
      FROM users
      WHERE id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  },

  /**
   * 신규 사용자 등록
   */
  async createUser({ email, password, nickname, role = 'user' }) {
    const query = `
      INSERT INTO users (email, password, nickname, role)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [email, password, nickname, role]);
    return result.insertId;
  },

  /**
   * 프로필 수정 (닉네임, 자기소개, 프로필 이미지)
   */
  async updateProfile(id, { nickname, bio, profile_image }) {
    const fields = ['nickname = ?', 'bio = ?'];
    const params = [nickname, bio];

    if (profile_image) {
      fields.push('profile_image = ?');
      params.push(profile_image);
    }

    params.push(id);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = ?
    `;
    const [result] = await pool.query(query, params);
    return result.affectedRows > 0;
  },

  /**
   * 사용자 활동 통계 조회 (작성글 수, 작성댓글 수, 받은 좋아요 합산)
   */
  async getUserStats(userId) {
    const postCountQuery = `SELECT COUNT(*) AS total FROM posts WHERE user_id = ?`;
    const commentCountQuery = `SELECT COUNT(*) AS total FROM comments WHERE user_id = ? AND is_deleted = 0`;
    const likeReceivedQuery = `SELECT COALESCE(SUM(like_count), 0) AS total FROM posts WHERE user_id = ?`;

    const [[postCount], [commentCount], [likeReceived]] = await Promise.all([
      pool.query(postCountQuery, [userId]),
      pool.query(commentCountQuery, [userId]),
      pool.query(likeReceivedQuery, [userId])
    ]);

    return {
      postCount: postCount[0].total,
      commentCount: commentCount[0].total,
      likeReceived: likeReceived[0].total
    };
  }
};

module.exports = userModel;
