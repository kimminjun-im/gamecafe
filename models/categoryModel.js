const pool = require('../config/database');

/**
 * Category Model
 * board_categories 테이블 관련 모듈
 */
const categoryModel = {
  /**
   * 전체 게시판 카테고리 목록 조회 (display_order 순)
   */
  async getAllCategories() {
    const query = `
      SELECT id, name, slug, display_order
      FROM board_categories
      ORDER BY display_order ASC
    `;
    const [rows] = await pool.query(query);
    return rows;
  },

  /**
   * 슬러그로 카테고리 단건 조회
   * @param {string} slug
   */
  async getCategoryBySlug(slug) {
    const query = `
      SELECT id, name, slug, display_order
      FROM board_categories
      WHERE slug = ?
    `;
    const [rows] = await pool.query(query, [slug]);
    return rows[0] || null;
  },

  /**
   * ID로 카테고리 단건 조회
   * @param {number} id
   */
  async getCategoryById(id) {
    const query = `
      SELECT id, name, slug, display_order
      FROM board_categories
      WHERE id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  }
};

module.exports = categoryModel;
