const pool = require('../config/database');

/**
 * Game Model
 * games 테이블 관련 데이터베이스 조회 모듈
 */
const gameModel = {
  /**
   * 메인 및 헤더에 노출할 전체 게임 목록 조회 (정렬 순서 기준)
   */
  async getAllGames() {
    const query = `
      SELECT id, name, slug, description, icon_image, banner_image, display_order, created_at
      FROM games
      ORDER BY display_order ASC, name ASC
    `;
    const [rows] = await pool.query(query);
    return rows;
  },

  /**
   * 게임 슬러그(slug)로 단일 게임 정보 조회
   */
  async getGameBySlug(slug) {
    const query = `
      SELECT id, name, slug, description, icon_image, banner_image, display_order, created_at
      FROM games
      WHERE slug = ?
    `;
    const [rows] = await pool.query(query, [slug]);
    return rows[0] || null;
  }
};

module.exports = gameModel;
