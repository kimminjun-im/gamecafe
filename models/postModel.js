const pool = require('../config/database');

/**
 * Post Model
 * posts 및 관련 테이블 데이터베이스 모듈
 */
const postModel = {
  /**
   * 인기 게시글 조회 (메인 홈용)
   */
  async getPopularPosts(limit = 6) {
    const query = `
      SELECT 
        p.id, p.game_id, p.category_id, p.user_id, p.title, p.content,
        p.view_count, p.like_count, p.comment_count, p.notice_type, p.created_at,
        u.nickname AS author_nickname, u.profile_image AS author_profile,
        g.name AS game_name, g.slug AS game_slug,
        c.name AS category_name, c.slug AS category_slug
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      JOIN board_categories c ON p.category_id = c.id
      WHERE p.notice_type = 'none'
      ORDER BY p.like_count DESC, p.created_at DESC
      LIMIT ?
    `;
    const [rows] = await pool.query(query, [limit]);
    return rows;
  },

  /**
   * 최신 게시글 조회 (메인 홈용)
   */
  async getRecentPosts(limit = 8) {
    const query = `
      SELECT 
        p.id, p.game_id, p.category_id, p.user_id, p.title, p.content,
        p.view_count, p.like_count, p.comment_count, p.notice_type, p.created_at,
        u.nickname AS author_nickname, u.profile_image AS author_profile,
        g.name AS game_name, g.slug AS game_slug,
        c.name AS category_name, c.slug AS category_slug
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      JOIN board_categories c ON p.category_id = c.id
      WHERE p.notice_type = 'none'
      ORDER BY p.created_at DESC
      LIMIT ?
    `;
    const [rows] = await pool.query(query, [limit]);
    return rows;
  },

  /**
   * 메인 홈 공지사항 조회
   */
  async getNoticePosts(limit = 5) {
    const query = `
      SELECT 
        p.id, p.game_id, p.category_id, p.user_id, p.title, p.content,
        p.view_count, p.like_count, p.comment_count, p.notice_type, p.created_at,
        u.nickname AS author_nickname,
        g.name AS game_name, g.slug AS game_slug,
        c.name AS category_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      JOIN board_categories c ON p.category_id = c.id
      WHERE p.notice_type IN ('global', 'game')
      ORDER BY (p.notice_type = 'global') DESC, p.created_at DESC
      LIMIT ?
    `;
    const [rows] = await pool.query(query, [limit]);
    return rows;
  },

  /**
   * 게임별 상단 고정 공지사항 조회 (전체 공지 + 해당 게임 공지)
   */
  async getNoticesForGame(gameId) {
    const query = `
      SELECT 
        p.id, p.game_id, p.category_id, p.user_id, p.title, p.content,
        p.view_count, p.like_count, p.comment_count, p.notice_type, p.created_at,
        u.nickname AS author_nickname,
        c.name AS category_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN board_categories c ON p.category_id = c.id
      WHERE p.notice_type = 'global' OR (p.notice_type = 'game' AND p.game_id = ?)
      ORDER BY (p.notice_type = 'global') DESC, p.created_at DESC
      LIMIT 5
    `;
    const [rows] = await pool.query(query, [gameId]);
    return rows;
  },

  /**
   * 게임별 일반 게시글 목록 조회
   */
  async getPostsByGame({ gameId, categorySlug = null, search = '', searchType = 'all', page = 1, limit = 10 }) {
    let whereClauses = ['p.game_id = ?', "p.notice_type = 'none'"];
    let params = [gameId];

    if (categorySlug && categorySlug !== 'all') {
      whereClauses.push('c.slug = ?');
      params.push(categorySlug);
    }

    if (search && search.trim() !== '') {
      const keyword = `%${search.trim()}%`;
      if (searchType === 'title') {
        whereClauses.push('p.title LIKE ?');
        params.push(keyword);
      } else if (searchType === 'content') {
        whereClauses.push('p.content LIKE ?');
        params.push(keyword);
      } else if (searchType === 'author') {
        whereClauses.push('u.nickname LIKE ?');
        params.push(keyword);
      } else {
        whereClauses.push('(p.title LIKE ? OR p.content LIKE ?)');
        params.push(keyword, keyword);
      }
    }

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const query = `
      SELECT 
        p.id, p.game_id, p.category_id, p.user_id, p.title, p.content,
        p.view_count, p.like_count, p.comment_count, p.notice_type, p.created_at,
        u.nickname AS author_nickname, u.profile_image AS author_profile,
        c.name AS category_name, c.slug AS category_slug
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN board_categories c ON p.category_id = c.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(query, params);
    return rows;
  },

  /**
   * 게임별 일반 게시글 총 개수 조회
   */
  async getPostCountByGame({ gameId, categorySlug = null, search = '', searchType = 'all' }) {
    let whereClauses = ['p.game_id = ?', "p.notice_type = 'none'"];
    let params = [gameId];

    if (categorySlug && categorySlug !== 'all') {
      whereClauses.push('c.slug = ?');
      params.push(categorySlug);
    }

    if (search && search.trim() !== '') {
      const keyword = `%${search.trim()}%`;
      if (searchType === 'title') {
        whereClauses.push('p.title LIKE ?');
        params.push(keyword);
      } else if (searchType === 'content') {
        whereClauses.push('p.content LIKE ?');
        params.push(keyword);
      } else if (searchType === 'author') {
        whereClauses.push('u.nickname LIKE ?');
        params.push(keyword);
      } else {
        whereClauses.push('(p.title LIKE ? OR p.content LIKE ?)');
        params.push(keyword, keyword);
      }
    }

    const query = `
      SELECT COUNT(*) AS total
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN board_categories c ON p.category_id = c.id
      WHERE ${whereClauses.join(' AND ')}
    `;

    const [rows] = await pool.query(query, params);
    return rows[0].total;
  },

  /**
   * [신규] 사이트 전체 통합 검색 쿼리
   */
  async searchAllPosts({ query = '', gameSlug = 'all', categorySlug = 'all', searchType = 'all', page = 1, limit = 10 }) {
    let whereClauses = ['1=1'];
    let params = [];

    // 게임 필터
    if (gameSlug && gameSlug !== 'all') {
      whereClauses.push('g.slug = ?');
      params.push(gameSlug);
    }

    // 카테고리 필터
    if (categorySlug && categorySlug !== 'all') {
      whereClauses.push('c.slug = ?');
      params.push(categorySlug);
    }

    // 검색어 필터
    if (query && query.trim() !== '') {
      const keyword = `%${query.trim()}%`;
      if (searchType === 'title') {
        whereClauses.push('p.title LIKE ?');
        params.push(keyword);
      } else if (searchType === 'content') {
        whereClauses.push('p.content LIKE ?');
        params.push(keyword);
      } else if (searchType === 'author') {
        whereClauses.push('u.nickname LIKE ?');
        params.push(keyword);
      } else {
        whereClauses.push('(p.title LIKE ? OR p.content LIKE ?)');
        params.push(keyword, keyword);
      }
    }

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const sql = `
      SELECT 
        p.id, p.game_id, p.category_id, p.user_id, p.title, p.content,
        p.view_count, p.like_count, p.comment_count, p.notice_type, p.created_at,
        u.nickname AS author_nickname, u.profile_image AS author_profile,
        g.name AS game_name, g.slug AS game_slug,
        c.name AS category_name, c.slug AS category_slug
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      JOIN board_categories c ON p.category_id = c.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * [신규] 사이트 전체 통합 검색 결과 개수 카운트
   */
  async countSearchAllPosts({ query = '', gameSlug = 'all', categorySlug = 'all', searchType = 'all' }) {
    let whereClauses = ['1=1'];
    let params = [];

    if (gameSlug && gameSlug !== 'all') {
      whereClauses.push('g.slug = ?');
      params.push(gameSlug);
    }

    if (categorySlug && categorySlug !== 'all') {
      whereClauses.push('c.slug = ?');
      params.push(categorySlug);
    }

    if (query && query.trim() !== '') {
      const keyword = `%${query.trim()}%`;
      if (searchType === 'title') {
        whereClauses.push('p.title LIKE ?');
        params.push(keyword);
      } else if (searchType === 'content') {
        whereClauses.push('p.content LIKE ?');
        params.push(keyword);
      } else if (searchType === 'author') {
        whereClauses.push('u.nickname LIKE ?');
        params.push(keyword);
      } else {
        whereClauses.push('(p.title LIKE ? OR p.content LIKE ?)');
        params.push(keyword, keyword);
      }
    }

    const sql = `
      SELECT COUNT(*) AS total
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      JOIN board_categories c ON p.category_id = c.id
      WHERE ${whereClauses.join(' AND ')}
    `;

    const [rows] = await pool.query(sql, params);
    return rows[0].total;
  },

  /**
   * [신규] 특정 사용자가 작성한 게시글 목록 조회
   */
  async getPostsByUserId(userId, limit = 20) {
    const query = `
      SELECT 
        p.id, p.title, p.view_count, p.like_count, p.comment_count, p.created_at,
        g.name AS game_name, g.slug AS game_slug,
        c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN games g ON p.game_id = g.id
      JOIN board_categories c ON p.category_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ?
    `;
    const [rows] = await pool.query(query, [userId, limit]);
    return rows;
  },

  /**
   * [신규] 특정 사용자가 좋아요를 누른 게시글 목록 조회
   */
  async getLikedPostsByUserId(userId, limit = 20) {
    const query = `
      SELECT 
        p.id, p.title, p.view_count, p.like_count, p.comment_count, p.created_at,
        l.created_at AS liked_at,
        u.nickname AS author_nickname,
        g.name AS game_name, g.slug AS game_slug,
        c.name AS category_name
      FROM post_likes l
      JOIN posts p ON l.post_id = p.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      JOIN board_categories c ON p.category_id = c.id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
      LIMIT ?
    `;
    const [rows] = await pool.query(query, [userId, limit]);
    return rows;
  },

  /**
   * 게시글 상세 조회
   */
  async getPostById(id) {
    const query = `
      SELECT 
        p.id, p.game_id, p.category_id, p.user_id, p.title, p.content,
        p.view_count, p.like_count, p.comment_count, p.notice_type, p.created_at, p.updated_at,
        u.nickname AS author_nickname, u.profile_image AS author_profile, u.role AS author_role,
        g.name AS game_name, g.slug AS game_slug,
        c.name AS category_name, c.slug AS category_slug
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      JOIN board_categories c ON p.category_id = c.id
      WHERE p.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  },

  /**
   * 게시글 신규 생성
   */
  async createPost({ game_id, category_id, user_id, title, content, notice_type = 'none' }) {
    const actualGameId = notice_type === 'global' ? null : game_id;
    const query = `
      INSERT INTO posts (game_id, category_id, user_id, title, content, notice_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [
      actualGameId,
      category_id,
      user_id,
      title,
      content,
      notice_type
    ]);
    return result.insertId;
  },

  /**
   * 게시글 수정
   */
  async updatePost(id, { category_id, title, content, notice_type = 'none', game_id = null }) {
    const actualGameId = notice_type === 'global' ? null : game_id;
    const query = `
      UPDATE posts 
      SET category_id = ?, title = ?, content = ?, notice_type = ?, game_id = ?
      WHERE id = ?
    `;
    const [result] = await pool.query(query, [
      category_id,
      title,
      content,
      notice_type,
      actualGameId,
      id
    ]);
    return result.affectedRows > 0;
  },

  /**
   * 게시글 삭제
   */
  async deletePost(id) {
    const query = `DELETE FROM posts WHERE id = ?`;
    const [result] = await pool.query(query, [id]);
    return result.affectedRows > 0;
  },

  /**
   * 조회수 1 증가
   */
  async incrementViewCount(id) {
    const query = `UPDATE posts SET view_count = view_count + 1 WHERE id = ?`;
    await pool.query(query, [id]);
  }
};

module.exports = postModel;
