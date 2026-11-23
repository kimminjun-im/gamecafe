const gameModel = require('../models/gameModel');
const categoryModel = require('../models/categoryModel');
const postModel = require('../models/postModel');
const commentModel = require('../models/commentModel');
const likeModel = require('../models/likeModel');

const postController = {
  /**
   * GET /games/:gameSlug
   * 게임별 게시판 목록 페이지
   */
  async list(req, res) {
    const { gameSlug } = req.params;
    const { category, search, type, page } = req.query;

    try {
      // 1. 게임 정보 조회
      const game = await gameModel.getGameBySlug(gameSlug);
      if (!game) {
        return res.status(404).render('index', {
          title: '게임을 찾을 수 없습니다 | GameCafe',
          games: [],
          popularPosts: [],
          recentPosts: [],
          noticePosts: [],
          dbError: '해당 게임 라운지가 존재하지 않습니다.'
        });
      }

      // 2. 카테고리 목록 및 현재 탭 설정
      const categories = await categoryModel.getAllCategories();
      const currentCategory = category || 'all';

      // 3. 상단 고정 공지사항 조회 (전체 공지 + 해당 게임 공지)
      const notices = await postModel.getNoticesForGame(game.id);

      // 4. 페이징 및 게시글 목록 조회
      const currentPage = Math.max(1, parseInt(page, 10) || 1);
      const limit = 10;
      const searchKeyword = (search || '').trim();
      const searchType = type || 'all';

      const [posts, totalCount] = await Promise.all([
        postModel.getPostsByGame({
          gameId: game.id,
          categorySlug: currentCategory,
          search: searchKeyword,
          searchType,
          page: currentPage,
          limit
        }),
        postModel.getPostCountByGame({
          gameId: game.id,
          categorySlug: currentCategory,
          search: searchKeyword,
          searchType
        })
      ]);

      const totalPages = Math.ceil(totalCount / limit) || 1;

      res.render('post/list', {
        title: `${game.name} 커뮤니티 | GameCafe`,
        game,
        categories,
        currentCategory,
        notices,
        posts,
        currentPage,
        totalPages,
        totalCount,
        search: searchKeyword,
        searchType
      });
    } catch (error) {
      console.error('게시글 목록 조회 중 에러:', error);
      res.status(500).render('index', {
        title: '오류 발생 | GameCafe',
        games: [],
        popularPosts: [],
        recentPosts: [],
        noticePosts: [],
        dbError: '게시글 목록을 불러오는 중 시스템 오류가 발생했습니다.'
      });
    }
  },

  /**
   * GET /posts/:id
   * 게시글 상세 보기 및 조회수 30분 쿨다운 증가
   */
  async detail(req, res) {
    const { id } = req.params;

    try {
      const post = await postModel.getPostById(id);
      if (!post) {
        return res.status(404).render('index', {
          title: '게시글을 찾을 수 없습니다 | GameCafe',
          games: [],
          popularPosts: [],
          recentPosts: [],
          noticePosts: [],
          dbError: '요청하신 게시글이 존재하지 않거나 삭제되었습니다.'
        });
      }

      // [조회수 정책]
      // 1) 작성자 본인이 아닐 때만 카운트
      // 2) 세션 30분 쿨다운 체크
      const isAuthor = req.session.user && req.session.user.id === post.user_id;
      if (!isAuthor) {
        req.session.viewedPosts = req.session.viewedPosts || {};
        const lastViewedAt = req.session.viewedPosts[id];
        const now = Date.now();
        const COOLDOWN_MS = 1000 * 60 * 30; // 30분

        if (!lastViewedAt || (now - lastViewedAt > COOLDOWN_MS)) {
          req.session.viewedPosts[id] = now;
          await postModel.incrementViewCount(id);
          post.view_count += 1; // 화면 렌더링용 즉시 반영
        }
      }

      // 수정 및 삭제 권한 확인 (작성자 본인 또는 관리자)
      const canEditOrDelete = Boolean(
        req.session.user && (req.session.user.id === post.user_id || req.session.user.role === 'admin')
      );

      // 댓글 목록 및 사용자 좋아요 여부 병렬 조회
      const currentUserId = req.session.user ? req.session.user.id : null;
      const [comments, isLiked] = await Promise.all([
        commentModel.getCommentsByPostId(id),
        likeModel.isPostLikedByUser(id, currentUserId)
      ]);

      res.render('post/detail', {
        title: `${post.title} | GameCafe`,
        post,
        comments,
        isLiked,
        canEditOrDelete
      });
    } catch (error) {
      console.error('게시글 상세 조회 중 에러:', error);
      res.status(500).render('index', {
        title: '오류 발생 | GameCafe',
        games: [],
        popularPosts: [],
        recentPosts: [],
        noticePosts: [],
        dbError: '게시글 상세 정보를 불러오는 중 오류가 발생했습니다.'
      });
    }
  },

  /**
   * GET /games/:gameSlug/write
   * 게시글 작성 폼 렌더링
   */
  async getWrite(req, res) {
    const { gameSlug } = req.params;

    try {
      const game = await gameModel.getGameBySlug(gameSlug);
      if (!game) {
        return res.redirect('/');
      }

      const categories = await categoryModel.getAllCategories();

      res.render('post/write', {
        title: `${game.name} - 새 글 작성 | GameCafe`,
        isEdit: false,
        game,
        categories,
        post: {
          category_id: req.query.category_id || '',
          title: '',
          content: '',
          notice_type: 'none'
        },
        errorMessage: null
      });
    } catch (error) {
      console.error('글 작성 페이지 오류:', error);
      res.redirect(`/games/${gameSlug}`);
    }
  },

  /**
   * POST /games/:gameSlug/write
   * 게시글 신규 등록
   */
  async postWrite(req, res) {
    const { gameSlug } = req.params;
    const { title, content, category_id, is_notice, notice_scope } = req.body;

    try {
      const game = await gameModel.getGameBySlug(gameSlug);
      if (!game) {
        return res.redirect('/');
      }

      const trimmedTitle = (title || '').trim();
      const trimmedContent = (content || '').trim();

      // 유효성 검증
      if (!trimmedTitle || !trimmedContent || !category_id) {
        const categories = await categoryModel.getAllCategories();
        return res.render('post/write', {
          title: `${game.name} - 새 글 작성 | GameCafe`,
          isEdit: false,
          game,
          categories,
          post: { category_id, title, content, notice_type: 'none' },
          errorMessage: '제목, 본문, 게시판 카테고리를 모두 입력해 주세요.'
        });
      }

      // 공지사항 설정 권한 검증 (관리자만 가능)
      let notice_type = 'none';
      if (is_notice && req.session.user && req.session.user.role === 'admin') {
        notice_type = notice_scope === 'global' ? 'global' : 'game';
      }

      const newPostId = await postModel.createPost({
        game_id: game.id,
        category_id: parseInt(category_id, 10),
        user_id: req.session.user.id,
        title: trimmedTitle,
        content: trimmedContent,
        notice_type
      });

      return res.redirect(`/posts/${newPostId}`);
    } catch (error) {
      console.error('글 작성 처리 중 오류:', error);
      const categories = await categoryModel.getAllCategories();
      res.render('post/write', {
        title: '새 글 작성 오류 | GameCafe',
        isEdit: false,
        game: { slug: gameSlug, name: '' },
        categories,
        post: { category_id, title, content, notice_type: 'none' },
        errorMessage: '게시글 저장 중 데이터베이스 오류가 발생했습니다.'
      });
    }
  },

  /**
   * GET /posts/:id/edit
   * 게시글 수정 폼 렌더링
   */
  async getEdit(req, res) {
    const { id } = req.params;

    try {
      const post = await postModel.getPostById(id);
      if (!post) {
        return res.redirect('/');
      }

      // 작성자 본인 또는 관리자 권한 검사
      const isAuthorized = req.session.user && (
        req.session.user.id === post.user_id || req.session.user.role === 'admin'
      );

      if (!isAuthorized) {
        return res.redirect(`/posts/${id}?error=` + encodeURIComponent('수정 권한이 없습니다.'));
      }

      const categories = await categoryModel.getAllCategories();

      res.render('post/write', {
        title: `게시글 수정 - ${post.title} | GameCafe`,
        isEdit: true,
        game: {
          id: post.game_id,
          name: post.game_name || '전체공지',
          slug: post.game_slug || 'lol'
        },
        categories,
        post,
        errorMessage: null
      });
    } catch (error) {
      console.error('게시글 수정 페이지 로드 오류:', error);
      res.redirect(`/posts/${id}`);
    }
  },

  /**
   * POST /posts/:id/edit
   * 게시글 수정 처리
   */
  async postEdit(req, res) {
    const { id } = req.params;
    const { title, content, category_id, is_notice, notice_scope } = req.body;

    try {
      const post = await postModel.getPostById(id);
      if (!post) {
        return res.redirect('/');
      }

      // 권한 검사
      const isAuthorized = req.session.user && (
        req.session.user.id === post.user_id || req.session.user.role === 'admin'
      );

      if (!isAuthorized) {
        return res.redirect(`/posts/${id}`);
      }

      const trimmedTitle = (title || '').trim();
      const trimmedContent = (content || '').trim();

      if (!trimmedTitle || !trimmedContent || !category_id) {
        const categories = await categoryModel.getAllCategories();
        return res.render('post/write', {
          title: `게시글 수정 | GameCafe`,
          isEdit: true,
          game: { id: post.game_id, name: post.game_name, slug: post.game_slug },
          categories,
          post: { ...post, title, content, category_id },
          errorMessage: '제목과 내용을 모두 채워 주세요.'
        });
      }

      // 공지사항 설정 권한 검증
      let notice_type = post.notice_type;
      if (req.session.user.role === 'admin') {
        if (is_notice) {
          notice_type = notice_scope === 'global' ? 'global' : 'game';
        } else {
          notice_type = 'none';
        }
      }

      await postModel.updatePost(id, {
        category_id: parseInt(category_id, 10),
        title: trimmedTitle,
        content: trimmedContent,
        notice_type,
        game_id: post.game_id
      });

      return res.redirect(`/posts/${id}`);
    } catch (error) {
      console.error('게시글 수정 처리 중 오류:', error);
      res.redirect(`/posts/${id}`);
    }
  },

  /**
   * POST /posts/:id/delete
   * 게시글 삭제 처리
   */
  async delete(req, res) {
    const { id } = req.params;

    try {
      const post = await postModel.getPostById(id);
      if (!post) {
        return res.redirect('/');
      }

      // 권한 검사 (작성자 본인 또는 관리자)
      const isAuthorized = req.session.user && (
        req.session.user.id === post.user_id || req.session.user.role === 'admin'
      );

      if (!isAuthorized) {
        return res.redirect(`/posts/${id}`);
      }

      const targetSlug = post.game_slug || 'lol';
      await postModel.deletePost(id);

      return res.redirect(`/games/${targetSlug}`);
    } catch (error) {
      console.error('게시글 삭제 처리 중 오류:', error);
      res.redirect(`/posts/${id}`);
    }
  }
};

module.exports = postController;
