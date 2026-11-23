const pool = require('../config/database');

/**
 * Admin Model
 * 관리자 대시보드 통계, 회원 관리, 게시글 및 공지사항 관리 쿼리
 */
const adminModel = {
  /**
   * 대시보드 4대 핵심 통계 조회
   */
  async getDashboardStats() {
    const userQuery = `SELECT COUNT(*) AS total FROM users`;
    const postQuery = `SELECT COUNT(*) AS total FROM posts`;
    const commentQuery = `SELECT COUNT(*) AS total FROM comments WHERE is_deleted = 0`;
    const todayPostQuery = `SELECT COUNT(*) AS total FROM posts WHERE DATE(created_at) = CURDATE()`;

    const [[users], [posts], [comments], [todayPosts]] = await Promise.all([
      pool.query(userQuery),
      pool.query(postQuery),
      pool.query(commentQuery),
      pool.query(todayPostQuery)
    ]);

    return {
      totalUsers: users[0].total,
      totalPosts: posts[0].total,
      totalComments: comments[0].total,
      todayPosts: todayPosts[0].total
    };
  },

  /**
   * 최근 가입한 회원 목록 (대시보드 위젯)
   */
  async getRecentUsers(limit = 5) {
    const query = `
      SELECT id, email, nickname, role, COALESCE(is_banned, 0) AS is_banned, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT ?
    `;
    const [rows] = await pool.query(query, [limit]);
    return rows;
  },

  /**
   * 최근 작성된 게시글 목록 (대시보드 위젯)
   */
  async getRecentPosts(limit = 5) {
    const query = `
      SELECT 
        p.id, p.title, p.notice_type, p.created_at, p.view_count, p.like_count,
        u.nickname AS author_nickname,
        g.name AS game_name,
        c.name AS category_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      JOIN board_categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
      LIMIT ?
    `;
    const [rows] = await pool.query(query, [limit]);
    return rows;
  },

  /**
   * 회원 목록 조회 (이메일/닉네임 검색 및 페이징)
   */
  async getAllUsers({ search = '', page = 1, limit = 10 }) {
    let whereClauses = ['1=1'];
    let params = [];

    if (search && search.trim() !== '') {
      const keyword = `%${search.trim()}%`;
      whereClauses.push('(email LIKE ? OR nickname LIKE ?)');
      params.push(keyword, keyword);
    }

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const query = `
      SELECT id, email, nickname, role, profile_image, COALESCE(is_banned, 0) AS is_banned, created_at
      FROM users
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, params);
    return rows;
  },

  /**
   * 전체 회원 수 카운트
   */
  async countAllUsers({ search = '' }) {
    let whereClauses = ['1=1'];
    let params = [];

    if (search && search.trim() !== '') {
      const keyword = `%${search.trim()}%`;
      whereClauses.push('(email LIKE ? OR nickname LIKE ?)');
      params.push(keyword, keyword);
    }

    const query = `SELECT COUNT(*) AS total FROM users WHERE ${whereClauses.join(' AND ')}`;
    const [rows] = await pool.query(query, params);
    return rows[0].total;
  },

  /**
   * 회원 정지 상태 토글 (is_banned: 1=정지, 0=정상)
   */
  async setUserBanStatus(userId, isBanned) {
    const query = `UPDATE users SET is_banned = ? WHERE id = ?`;
    const [result] = await pool.query(query, [isBanned ? 1 : 0, userId]);
    return result.affectedRows > 0;
  },

  /**
   * 회원 권한 변경 ('admin' 또는 'user')
   */
  async setUserRole(userId, newRole) {
    const roleValue = newRole === 'admin' ? 'admin' : 'user';
    const query = `UPDATE users SET role = ? WHERE id = ?`;
    const [result] = await pool.query(query, [roleValue, userId]);
    return result.affectedRows > 0;
  },

  /**
   * 관리자용 전체 게시글 목록 조회
   */
  async getAllPostsAdmin({ search = '', gameSlug = 'all', page = 1, limit = 10 }) {
    let whereClauses = ['1=1'];
    let params = [];

    if (gameSlug && gameSlug !== 'all') {
      whereClauses.push('g.slug = ?');
      params.push(gameSlug);
    }

    if (search && search.trim() !== '') {
      const keyword = `%${search.trim()}%`;
      whereClauses.push('(p.title LIKE ? OR u.nickname LIKE ?)');
      params.push(keyword, keyword);
    }

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const query = `
      SELECT 
        p.id, p.title, p.notice_type, p.view_count, p.like_count, p.comment_count, p.created_at,
        u.id AS author_id, u.nickname AS author_nickname,
        g.name AS game_name, g.slug AS game_slug,
        c.name AS category_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      JOIN board_categories c ON p.category_id = c.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, params);
    return rows;
  },

  /**
   * 관리자용 전체 게시글 수 카운트
   */
  async countAllPostsAdmin({ search = '', gameSlug = 'all' }) {
    let whereClauses = ['1=1'];
    let params = [];

    if (gameSlug && gameSlug !== 'all') {
      whereClauses.push('g.slug = ?');
      params.push(gameSlug);
    }

    if (search && search.trim() !== '') {
      const keyword = `%${search.trim()}%`;
      whereClauses.push('(p.title LIKE ? OR u.nickname LIKE ?)');
      params.push(keyword, keyword);
    }

    const query = `
      SELECT COUNT(*) AS total
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      WHERE ${whereClauses.join(' AND ')}
    `;
    const [rows] = await pool.query(query, params);
    return rows[0].total;
  },

  /**
   * 관리자용 공지사항 목록 조회 (global 및 game 공지)
   */
  async getNoticesAdmin({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT 
        p.id, p.title, p.content, p.notice_type, p.view_count, p.created_at,
        u.nickname AS author_nickname,
        g.id AS game_id, g.name AS game_name, g.slug AS game_slug
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      WHERE p.notice_type IN ('global', 'game')
      ORDER BY (p.notice_type = 'global') DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [limit, offset]);
    return rows;
  },

  /**
   * 관리자용 공지사항 총 개수 카운트
   */
  async countNoticesAdmin() {
    const query = `SELECT COUNT(*) AS total FROM posts WHERE notice_type IN ('global', 'game')`;
    const [rows] = await pool.query(query);
    return rows[0].total;
  }
};

module.exports = adminModel;
