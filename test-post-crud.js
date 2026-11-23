const path = require('path');
const ejs = require('ejs');

async function runPostCrudTests() {
  console.log('========================================================');
  console.log('🧪 GameCafe Step 4 게임별 게시판 및 CRUD 단위 테스트');
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

  // 1. EJS 뷰 템플릿 렌더링 무결성 검증
  console.log('\n[테스트 1] EJS 뷰 템플릿 렌더링 테스트');
  const listViewPath = path.join(__dirname, 'views', 'post', 'list.ejs');
  const detailViewPath = path.join(__dirname, 'views', 'post', 'detail.ejs');
  const writeViewPath = path.join(__dirname, 'views', 'post', 'write.ejs');

  const mockGame = { id: 1, name: '리그 오브 레전드', slug: 'lol', description: 'LOL 설명' };
  const mockCategories = [
    { id: 1, name: '공지사항', slug: 'notice' },
    { id: 2, name: '자유게시판', slug: 'free' },
    { id: 3, name: '공략게시판', slug: 'guide' }
  ];
  const mockPost = {
    id: 101,
    game_id: 1,
    game_name: '리그 오브 레전드',
    game_slug: 'lol',
    category_id: 3,
    category_name: '공략게시판',
    user_id: 10,
    author_nickname: '페이커',
    author_role: 'user',
    title: '미드 아리 완벽 공략',
    content: '1. 라인전 운영법\n2. 한타 포지셔닝',
    view_count: 50,
    like_count: 12,
    comment_count: 3,
    notice_type: 'none',
    created_at: '2026-11-23 12:00:00'
  };

  try {
    // 1-1. 게시판 목록 렌더링
    const listHtml = await ejs.renderFile(listViewPath, {
      title: 'LOL 게시판',
      game: mockGame,
      categories: mockCategories,
      currentCategory: 'all',
      notices: [{ id: 1, title: '전체 공지', notice_type: 'global', author_nickname: '운영자', created_at: '2026-11-23' }],
      posts: [mockPost],
      currentPage: 1,
      totalPages: 1,
      totalCount: 1,
      search: '',
      searchType: 'all',
      user: null,
      currentPath: '/games/lol',
      navGames: [mockGame]
    });
    assert(listHtml.includes('리그 오브 레전드 커뮤니티'), '게임명 배너가 목록에 렌더링되는가');
    assert(listHtml.includes('미드 아리 완벽 공략'), '게시글 제목이 목록 테이블에 렌더링되는가');
    assert(listHtml.includes('전체공지'), '상단 고정 공지가 렌더링되는가');

    // 1-2. 게시글 상세 페이지 렌더링 (일반 방문자 vs 작성자 본인)
    const detailVisitorHtml = await ejs.renderFile(detailViewPath, {
      title: '상세보기',
      post: mockPost,
      canEditOrDelete: false,
      user: null,
      currentPath: '/posts/101',
      navGames: [mockGame]
    });
    assert(detailVisitorHtml.includes('1. 라인전 운영법'), '게시글 본문이 상세 화면에 정상 출력되는가');
    assert(!detailVisitorHtml.includes('onsubmit="return confirm'), '비작성자/비로그인 시 [수정/삭제] 버튼 숨김');

    const detailAuthorHtml = await ejs.renderFile(detailViewPath, {
      title: '상세보기',
      post: mockPost,
      canEditOrDelete: true,
      user: { id: 10, nickname: '페이커', role: 'user' },
      currentPath: '/posts/101',
      navGames: [mockGame]
    });
    assert(detailAuthorHtml.includes('onsubmit="return confirm'), '작성자 본인 접속 시 [수정/삭제] 버튼 노출');

    // 1-3. 글쓰기/수정 폼 렌더링
    const writeHtml = await ejs.renderFile(writeViewPath, {
      title: '새 글 작성',
      isEdit: false,
      game: mockGame,
      categories: mockCategories,
      post: { category_id: '', title: '', content: '' },
      errorMessage: null,
      user: { id: 10, nickname: '페이커', role: 'user' },
      currentPath: '/games/lol/write',
      navGames: [mockGame]
    });
    assert(writeHtml.includes('리그 오브 레전드 - 새 글 작성'), '새 글 작성 헤더가 렌더링되는가');
    assert(!writeHtml.includes('📢 공지사항으로 상단 고정 등록'), '일반 회원은 공지 등록 옵션이 노출되지 않는가');

    const adminWriteHtml = await ejs.renderFile(writeViewPath, {
      title: '새 글 작성 (관리자)',
      isEdit: false,
      game: mockGame,
      categories: mockCategories,
      post: { category_id: '', title: '', content: '' },
      errorMessage: null,
      user: { id: 99, role: 'admin' },
      currentPath: '/games/lol/write',
      navGames: [mockGame]
    });
    assert(adminWriteHtml.includes('📢 공지사항으로 상단 고정 등록'), '관리자 접속 시 공지 등록 체크박스 활성화');

  } catch (err) {
    console.error('뷰 렌더링 에러:', err);
    assert(false, 'EJS 뷰 렌더링 무결성 통과');
  }

  // 2. 권한 검사 비즈니스 로직 테스트
  console.log('\n[테스트 2] 서버 사이드 수정/삭제 권한 검사 로직');
  function checkCanEditOrDelete(user, post) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.id === post.user_id;
  }

  const postAuthor = { id: 10, role: 'user' };
  const otherUser = { id: 20, role: 'user' };
  const adminUser = { id: 99, role: 'admin' };

  assert(checkCanEditOrDelete(postAuthor, mockPost) === true, '작성자 본인은 수정/삭제 허용');
  assert(checkCanEditOrDelete(otherUser, mockPost) === false, '다른 사용자의 글 수정/삭제 차단');
  assert(checkCanEditOrDelete(null, mockPost) === false, '비로그인 사용자 수정/삭제 차단');
  assert(checkCanEditOrDelete(adminUser, mockPost) === true, '관리자는 타인의 글도 관리 허용');

  // 3. 조회수 증가 정책 테스트
  console.log('\n[테스트 3] 조회수 30분 쿨다운 및 본인 글 제외 정책 검증');
  function shouldIncrementView(sessionUser, postUserId, viewedPosts, postId) {
    // 1) 본인 글이면 제외
    if (sessionUser && sessionUser.id === postUserId) {
      return false;
    }
    // 2) 세션 쿨다운 (30분)
    const lastViewedAt = viewedPosts[postId];
    const now = Date.now();
    const COOLDOWN_MS = 1000 * 60 * 30;
    if (!lastViewedAt || (now - lastViewedAt > COOLDOWN_MS)) {
      viewedPosts[postId] = now;
      return true;
    }
    return false;
  }

  const testSession = {};
  assert(shouldIncrementView({ id: 10 }, 10, testSession, 101) === false, '작성자 본인이 읽을 때는 조회수 증가 안 함');
  assert(shouldIncrementView({ id: 20 }, 10, testSession, 101) === true, '타인이 최초 조회 시 조회수 증가 허용');
  assert(shouldIncrementView({ id: 20 }, 10, testSession, 101) === false, '30분 이내 새로고침(F5) 시 조회수 중복 증가 차단');
  
  // 31분 전으로 조작
  testSession[101] = Date.now() - (1000 * 60 * 31);
  assert(shouldIncrementView({ id: 20 }, 10, testSession, 101) === true, '30분 경과 후 재방문 시 조회수 다시 1회 증가');

  console.log('\n========================================================');
  console.log(`📊 테스트 결과: ${passedTests} / ${totalTests} 성공 (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================');
}

runPostCrudTests();
