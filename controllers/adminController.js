const adminModel = require('../models/adminModel');
const gameModel = require('../models/gameModel');
const postModel = require('../models/postModel');

const adminController = {
  /**
   * GET /admin
   * 관리자 대시보드 메인
   */
  async dashboard(req, res) {
    try {
      const [stats, recentUsers, recentPosts] = await Promise.all([
        adminModel.getDashboardStats(),
        adminModel.getRecentUsers(5),
        adminModel.getRecentPosts(5)
      ]);

      res.render('admin/dashboard', {
        title: '관리자 대시보드 | GameCafe Admin',
        currentAdminPath: '/admin',
        stats,
        recentUsers,
        recentPosts
      });
    } catch (error) {
      console.error('관리자 대시보드 에러:', error);
      res.status(500).send('관리자 대시보드를 불러오는 중 오류가 발생했습니다.');
    }
  },

  /**
   * GET /admin/users
   * 회원 관리 목록
   */
  async userList(req, res) {
    const { search, page } = req.query;
    const searchKeyword = (search || '').trim();
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const limit = 10;

    try {
      const [users, totalCount] = await Promise.all([
        adminModel.getAllUsers({ search: searchKeyword, page: currentPage, limit }),
        adminModel.countAllUsers({ search: searchKeyword })
      ]);

      const totalPages = Math.ceil(totalCount / limit) || 1;

      res.render('admin/users', {
        title: '회원 관리 | GameCafe Admin',
        currentAdminPath: '/admin/users',
        users,
        totalCount,
        currentPage,
        totalPages,
        searchQuery: searchKeyword,
        successMessage: req.query.success || null,
        errorMessage: req.query.error || null
      });
    } catch (error) {
      console.error('회원 관리 목록 조회 에러:', error);
      res.redirect('/admin');
    }
  },

  /**
   * POST /admin/users/:id/ban
   * 회원 정지 및 정지 해제 토글
   */
  async toggleBan(req, res) {
    const targetUserId = parseInt(req.params.id, 10);
    const { is_banned } = req.body;
    const shouldBan = is_banned === '1' || is_banned === true;

    // [보안 방어] 관리자 본인 계정 정지 원천 차단
    if (req.session.user.id === targetUserId) {
      return res.redirect('/admin/users?error=' + encodeURIComponent('자기 자신을 정지할 수 없습니다.'));
    }

    try {
      await adminModel.setUserBanStatus(targetUserId, shouldBan);
      const msg = shouldBan ? '회원이 정지 처리되었습니다.' : '회원 정지가 해제되었습니다.';
      return res.redirect('/admin/users?success=' + encodeURIComponent(msg));
    } catch (error) {
      console.error('회원 정지 처리 오류:', error);
      return res.redirect('/admin/users?error=' + encodeURIComponent('정지 상태 변경 중 오류가 발생했습니다.'));
    }
  },

  /**
   * POST /admin/users/:id/role
   * 회원 권한 변경 ('admin' <-> 'user')
   */
  async changeRole(req, res) {
    const targetUserId = parseInt(req.params.id, 10);
    const { role } = req.body;

    // [보안 방어] 본인 관리자 권한 스스로 박탈 방지
    if (req.session.user.id === targetUserId && role !== 'admin') {
      return res.redirect('/admin/users?error=' + encodeURIComponent('자기 자신의 관리자 권한을 해제할 수 없습니다.'));
    }

    try {
      await adminModel.setUserRole(targetUserId, role);
      return res.redirect('/admin/users?success=' + encodeURIComponent('회원 권한이 성공적으로 변경되었습니다.'));
    } catch (error) {
      console.error('회원 권한 변경 오류:', error);
      return res.redirect('/admin/users?error=' + encodeURIComponent('권한 변경 중 시스템 오류가 발생했습니다.'));
    }
  },

  /**
   * GET /admin/posts
   * 전체 게시글 관리 목록
   */
  async postList(req, res) {
    const { search, game, page } = req.query;
    const searchKeyword = (search || '').trim();
    const selectedGame = game || 'all';
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const limit = 10;

    try {
      const [games, posts, totalCount] = await Promise.all([
        gameModel.getAllGames(),
        adminModel.getAllPostsAdmin({ search: searchKeyword, gameSlug: selectedGame, page: currentPage, limit }),
        adminModel.countAllPostsAdmin({ search: searchKeyword, gameSlug: selectedGame })
      ]);

      const totalPages = Math.ceil(totalCount / limit) || 1;

      res.render('admin/posts', {
        title: '게시글 관리 | GameCafe Admin',
        currentAdminPath: '/admin/posts',
        games,
        posts,
        totalCount,
        currentPage,
        totalPages,
        searchQuery: searchKeyword,
        selectedGame,
        successMessage: req.query.success || null,
        errorMessage: req.query.error || null
      });
    } catch (error) {
      console.error('관리자 게시글 목록 오류:', error);
      res.redirect('/admin');
    }
  },

  /**
   * POST /admin/posts/:id/delete
   * 관리자 권한으로 부적절한 게시글 강제 삭제
   */
  async deletePost(req, res) {
    const postId = parseInt(req.params.id, 10);

    try {
      await postModel.deletePost(postId);
      return res.redirect('/admin/posts?success=' + encodeURIComponent('게시글이 성공적으로 삭제되었습니다.'));
    } catch (error) {
      console.error('관리자 게시글 삭제 오류:', error);
      return res.redirect('/admin/posts?error=' + encodeURIComponent('게시글 삭제 중 오류가 발생했습니다.'));
    }
  },

  /**
   * GET /admin/notices
   * 전체 및 게임별 공지사항 관리 목록
   */
  async noticeList(req, res) {
    const { page } = req.query;
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const limit = 10;

    try {
      const [games, notices, totalCount] = await Promise.all([
        gameModel.getAllGames(),
        adminModel.getNoticesAdmin({ page: currentPage, limit }),
        adminModel.countNoticesAdmin()
      ]);

      const totalPages = Math.ceil(totalCount / limit) || 1;

      res.render('admin/notices', {
        title: '공지사항 관리 | GameCafe Admin',
        currentAdminPath: '/admin/notices',
        games,
        notices,
        totalCount,
        currentPage,
        totalPages,
        successMessage: req.query.success || null,
        errorMessage: req.query.error || null
      });
    } catch (error) {
      console.error('공지사항 목록 로드 오류:', error);
      res.redirect('/admin');
    }
  },

  /**
   * POST /admin/notices/create
   * 신규 공지사항(전체 공지 또는 게임별 공지) 등록
   */
  async createNotice(req, res) {
    const { title, content, notice_type, game_id } = req.body;
    const trimmedTitle = (title || '').trim();
    const trimmedContent = (content || '').trim();

    if (!trimmedTitle || !trimmedContent) {
      return res.redirect('/admin/notices?error=' + encodeURIComponent('공지 제목과 내용을 모두 입력해 주세요.'));
    }

    try {
      // MySQL 8.4 정합성 체크:
      // global 공지는 game_id = null
      // game 공지는 game_id 필수
      const isGlobal = notice_type === 'global';
      const actualGameId = isGlobal ? null : parseInt(game_id, 10);

      await postModel.createPost({
        game_id: actualGameId,
        category_id: 1, // 공지사항 카테고리 ID
        user_id: req.session.user.id,
        title: trimmedTitle,
        content: trimmedContent,
        notice_type: isGlobal ? 'global' : 'game'
      });

      return res.redirect('/admin/notices?success=' + encodeURIComponent('공지사항이 성공적으로 등록되었습니다.'));
    } catch (error) {
      console.error('공지사항 생성 오류:', error);
      return res.redirect('/admin/notices?error=' + encodeURIComponent('공지사항 등록 중 시스템 오류가 발생했습니다.'));
    }
  }
};

module.exports = adminController;
