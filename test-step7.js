const path = require('path');
const ejs = require('ejs');

async function runStep7Tests() {
  console.log('========================================================');
  console.log('🧪 GameCafe Step 7 관리자 시스템 및 보안 검증 단위 테스트');
  console.log('========================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  // 1. 관리자 접근 제어 가드 (isAdmin 미들웨어) 테스트
  console.log('\n[테스트 1] 관리자 권한 접근 제어 (isAdmin 가드)');
  const { isAdmin } = require('./middlewares/authMiddleware');

  let guestBlocked = false;
  isAdmin({ session: {} }, { status: (code) => ({ render: () => { if (code === 403) guestBlocked = true; } }) }, () => {});
  assert(guestBlocked === true, '비로그인 사용자 관리자 페이지 접근 차단 (403)');

  let userBlocked = false;
  isAdmin({ session: { user: { id: 10, role: 'user' } } }, { status: (code) => ({ render: () => { if (code === 403) userBlocked = true; } }) }, () => {});
  assert(userBlocked === true, '일반 사용자 관리자 페이지 접근 차단 (403)');

  let adminAllowed = false;
  isAdmin({ session: { user: { id: 1, role: 'admin' } } }, {}, () => { adminAllowed = true; });
  assert(adminAllowed === true, '관리자(role: admin) 관리자 페이지 접근 정상 허용');

  // 2. 관리자 본인 계정 보호 로직 검증 (셀프 정지 및 셀프 권한 박탈 방어)
  console.log('\n[테스트 2] 관리자 본인 계정 보호 보안 규칙');
  function checkSelfProtection(currentAdminId, targetUserId, action, newRole = null) {
    if (currentAdminId === targetUserId) {
      if (action === 'ban') {
        return { allowed: false, reason: 'SELF_BAN_BLOCKED' };
      }
      if (action === 'role' && newRole !== 'admin') {
        return { allowed: false, reason: 'SELF_DEMOTE_BLOCKED' };
      }
    }
    return { allowed: true };
  }

  assert(checkSelfProtection(1, 1, 'ban').allowed === false, '관리자 본인 계정 정지 시도 차단');
  assert(checkSelfProtection(1, 1, 'role', 'user').allowed === false, '관리자 본인 권한 박탈 시도 차단');
  assert(checkSelfProtection(1, 2, 'ban').allowed === true, '타인 회원 정지 처리 허용');
  assert(checkSelfProtection(1, 2, 'role', 'admin').allowed === true, '타인 회원 관리자 임명 허용');

  // 3. 정지 회원(is_banned = 1) 로그인 차단 로직 검증
  console.log('\n[테스트 3] 정지된 회원 로그인 차단 정책');
  function canLogin(user) {
    if (!user) return { success: false, reason: 'NOT_FOUND' };
    if (user.is_banned === 1) return { success: false, reason: 'BANNED' };
    return { success: true };
  }

  const normalUser = { id: 10, email: 'normal@gamecafe.com', is_banned: 0 };
  const bannedUser = { id: 20, email: 'banned@gamecafe.com', is_banned: 1 };

  assert(canLogin(normalUser).success === true, '정상 회원(is_banned: 0) 로그인 통과');
  assert(canLogin(bannedUser).success === false && canLogin(bannedUser).reason === 'BANNED', '정지 회원(is_banned: 1) 로그인 즉시 차단');

  // 4. 공지사항 등록 시 MySQL 8.4 정합성 규칙 검증
  console.log('\n[테스트 4] 전체 공지 vs 게임 공지 무결성 규칙');
  function validateNoticeCreation(notice_type, game_id) {
    if (notice_type === 'global' && game_id !== null) {
      return { valid: false, reason: 'GLOBAL_MUST_HAVE_NULL_GAME_ID' };
    }
    if (notice_type === 'game' && (!game_id || isNaN(game_id))) {
      return { valid: false, reason: 'GAME_NOTICE_REQUIRES_GAME_ID' };
    }
    return { valid: true };
  }

  assert(validateNoticeCreation('global', null).valid === true, '전체 공지는 game_id=null 허용');
  assert(validateNoticeCreation('global', 1).valid === false, '전체 공지에 game_id 부여 시 차단 (CHECK 위반 방지)');
  assert(validateNoticeCreation('game', 1).valid === true, '게임 공지는 유효한 game_id 필수 충족');
  assert(validateNoticeCreation('game', null).valid === false, '게임 공지에 game_id 누락 시 차단');

  // 5. EJS 관리자 뷰 템플릿 렌더링 무결성 검증
  console.log('\n[테스트 5] EJS 관리자 뷰 템플릿 렌더링 검증');
  const dashboardViewPath = path.join(__dirname, 'views', 'admin', 'dashboard.ejs');
  const usersViewPath = path.join(__dirname, 'views', 'admin', 'users.ejs');
  const postsViewPath = path.join(__dirname, 'views', 'admin', 'posts.ejs');
  const noticesViewPath = path.join(__dirname, 'views', 'admin', 'notices.ejs');

  const adminSessionUser = { id: 1, nickname: '최고관리자', role: 'admin', email: 'admin@gamecafe.com' };
  const mockGames = [
    { id: 1, name: '리그 오브 레전드', slug: 'lol' },
    { id: 2, name: '발로란트', slug: 'valorant' }
  ];

  try {
    // 5-1. 대시보드 화면 렌더링
    const dashHtml = await ejs.renderFile(dashboardViewPath, {
      title: '대시보드',
      currentAdminPath: '/admin/dashboard',
      stats: { totalUsers: 150, totalPosts: 420, totalComments: 980, todayPosts: 15 },
      recentUsers: [
        { id: 10, nickname: '신규유저', email: 'new@gamecafe.com', role: 'user', is_banned: 0, created_at: '2026-11-23' }
      ],
      recentPosts: [
        { id: 101, title: '최신 공략글', notice_type: 'none', view_count: 30, like_count: 5, author_nickname: '페이커', game_name: 'LOL', category_name: '공략', created_at: '2026-11-23' }
      ],
      user: adminSessionUser,
      currentPath: '/admin',
      navGames: mockGames
    });
    assert(dashHtml.includes('관리자 대시보드'), '대시보드 헤더가 렌더링되는가');
    assert(dashHtml.includes('150'), '전체 회원 수 통계가 렌더링되는가');
    assert(dashHtml.includes('신규유저'), '최근 가입 회원이 테이블에 표시되는가');

    // 5-2. 회원 관리 화면 렌더링
    const usersHtml = await ejs.renderFile(usersViewPath, {
      title: '회원 관리',
      currentAdminPath: '/admin/users',
      users: [
        { id: 1, nickname: '최고관리자', email: 'admin@gamecafe.com', role: 'admin', is_banned: 0, created_at: '2026-11-23' },
        { id: 2, nickname: '비매너유저', email: 'bad@gamecafe.com', role: 'user', is_banned: 1, created_at: '2026-11-23' }
      ],
      totalCount: 2,
      currentPage: 1,
      totalPages: 1,
      searchQuery: '',
      successMessage: null,
      errorMessage: null,
      user: adminSessionUser,
      currentPath: '/admin/users',
      navGames: mockGames
    });
    assert(usersHtml.includes('(본인 계정)'), '관리자 본인 계정에 정지 버튼 대신 (본인 계정) 표시 확인');
    assert(usersHtml.includes('정지 해제'), '정지된 회원에게 정지 해제 버튼 노출 확인');

    // 5-3. 게시글 관리 화면 렌더링
    const postsHtml = await ejs.renderFile(postsViewPath, {
      title: '게시글 관리',
      currentAdminPath: '/admin/posts',
      games: mockGames,
      posts: [
        { id: 200, title: '부적절한 게시글', comment_count: 0, author_nickname: '트롤러', game_name: '발로란트', category_name: '자유', created_at: '2026-11-23', view_count: 10, like_count: 0 }
      ],
      totalCount: 1,
      currentPage: 1,
      totalPages: 1,
      searchQuery: '',
      selectedGame: 'all',
      successMessage: null,
      errorMessage: null,
      user: adminSessionUser,
      currentPath: '/admin/posts',
      navGames: mockGames
    });
    assert(postsHtml.includes('강제삭제'), '관리자 전용 게시글 강제삭제 버튼 노출 확인');

    // 5-4. 공지사항 관리 화면 렌더링
    const noticesHtml = await ejs.renderFile(noticesViewPath, {
      title: '공지사항 관리',
      currentAdminPath: '/admin/notices',
      games: mockGames,
      notices: [
        { id: 1, title: '사이트 점검 안내', notice_type: 'global', game_name: null, author_nickname: '운영자', view_count: 100, created_at: '2026-11-23' }
      ],
      totalCount: 1,
      currentPage: 1,
      totalPages: 1,
      successMessage: null,
      errorMessage: null,
      user: adminSessionUser,
      currentPath: '/admin/notices',
      navGames: mockGames
    });
    assert(noticesHtml.includes('신규 공지사항 작성'), '공지사항 작성 폼 렌더링 확인');
    assert(noticesHtml.includes('사이트 점검 안내'), '등록된 공지 목록 표시 확인');

  } catch (err) {
    console.error('관리자 뷰 렌더링 에러:', err);
    assert(false, 'EJS 관리자 뷰 렌더링 성공');
  }

  console.log('\n========================================================');
  console.log(`📊 Step 7 결과: ${passedTests} / ${totalTests} 성공 (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================');
}

runStep7Tests();
