const gameModel = require('../models/gameModel');
const postModel = require('../models/postModel');

/**
 * Home Controller
 * 메인 홈페이지 요청 처리 컨트롤러
 */
const homeController = {
  /**
   * GET / 메인 홈페이지 렌더링
   */
  async index(req, res, next) {
    try {
      // DB에서 게임 목록, 인기글, 최신글, 공지사항을 병렬로 조회
      const [games, popularPosts, recentPosts, noticePosts] = await Promise.all([
        gameModel.getAllGames(),
        postModel.getPopularPosts(6),
        postModel.getRecentPosts(8),
        postModel.getNoticePosts(5)
      ]);

      res.render('index', {
        title: 'GameCafe - 게이머들을 위한 종합 커뮤니티',
        games,
        popularPosts,
        recentPosts,
        noticePosts,
        currentPath: '/'
      });
    } catch (error) {
      console.error('메인 페이지 로딩 중 데이터베이스 조회 오류:', error.message);
      
      // DB 연결이 안 되었을 때도 서버가 멈추지 않고 안내 화면을 제공
      res.render('index', {
        title: 'GameCafe - 게이머들을 위한 종합 커뮤니티',
        games: [],
        popularPosts: [],
        recentPosts: [],
        noticePosts: [],
        currentPath: '/',
        dbError: error.message
      });
    }
  }
};

module.exports = homeController;
