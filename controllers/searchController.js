const gameModel = require('../models/gameModel');
const categoryModel = require('../models/categoryModel');
const postModel = require('../models/postModel');

const searchController = {
  /**
   * GET /search
   * 사이트 통합 검색 페이지
   */
  async search(req, res) {
    const { query, game, category, type, page } = req.query;

    const searchKeyword = (query || '').trim();
    const selectedGame = game || 'all';
    const selectedCategory = category || 'all';
    const searchType = type || 'all';
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const limit = 10;

    try {
      const [games, categories, posts, totalCount] = await Promise.all([
        gameModel.getAllGames(),
        categoryModel.getAllCategories(),
        postModel.searchAllPosts({
          query: searchKeyword,
          gameSlug: selectedGame,
          categorySlug: selectedCategory,
          searchType,
          page: currentPage,
          limit
        }),
        postModel.countSearchAllPosts({
          query: searchKeyword,
          gameSlug: selectedGame,
          categorySlug: selectedCategory,
          searchType
        })
      ]);

      const totalPages = Math.ceil(totalCount / limit) || 1;

      res.render('search/index', {
        title: searchKeyword ? `'${searchKeyword}' 검색 결과 | GameCafe` : '통합 검색 | GameCafe',
        games,
        categories,
        posts,
        totalCount,
        currentPage,
        totalPages,
        searchQuery: searchKeyword,
        selectedGame,
        selectedCategory,
        searchType
      });
    } catch (error) {
      console.error('통합 검색 처리 중 오류:', error);
      res.status(500).render('search/index', {
        title: '검색 오류 | GameCafe',
        games: [],
        categories: [],
        posts: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 1,
        searchQuery: searchKeyword,
        selectedGame: 'all',
        selectedCategory: 'all',
        searchType: 'all',
        errorMessage: '검색 처리 중 시스템 오류가 발생했습니다.'
      });
    }
  }
};

module.exports = searchController;
