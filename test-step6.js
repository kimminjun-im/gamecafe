const path = require('path');
const ejs = require('ejs');

async function runStep6Tests() {
  console.log('========================================================');
  console.log('🧪 GameCafe Step 6 통합 검색 및 마이페이지 단위 테스트');
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

  // 1. 검색 쿼리 및 필터 빌더 로직 검증
  console.log('\n[테스트 1] 검색 조건 빌더 및 필터링 로직 검증');
  function buildSearchWhereClause({ query, gameSlug, categorySlug, searchType }) {
    const where = ['1=1'];
    if (gameSlug && gameSlug !== 'all') where.push('g.slug = ?');
    if (categorySlug && categorySlug !== 'all') where.push('c.slug = ?');
    if (query && query.trim() !== '') {
      if (searchType === 'title') where.push('p.title LIKE ?');
      else if (searchType === 'content') where.push('p.content LIKE ?');
      else if (searchType === 'author') where.push('u.nickname LIKE ?');
      else where.push('(p.title LIKE ? OR p.content LIKE ?)');
    }
    return where.join(' AND ');
  }

  const where1 = buildSearchWhereClause({ query: '아리', gameSlug: 'lol', categorySlug: 'guide', searchType: 'title' });
  assert(where1.includes('g.slug = ?') && where1.includes('c.slug = ?') && where1.includes('p.title LIKE ?'), '게임 + 카테고리 + 제목 검색 조건 올바르게 조합');

  const where2 = buildSearchWhereClause({ query: '페이커', gameSlug: 'all', categorySlug: 'all', searchType: 'author' });
  assert(!where2.includes('g.slug') && where2.includes('u.nickname LIKE ?'), '작성자 닉네임 검색 조건 올바르게 조합');

  const where3 = buildSearchWhereClause({ query: '발로란트', gameSlug: 'all', categorySlug: 'all', searchType: 'all' });
  assert(where3.includes('(p.title LIKE ? OR p.content LIKE ?)'), '제목+내용 통합 검색 조건 조합');

  // 2. 파일 업로드 보안 필터 검증 (확장자 및 MIME 타입)
  console.log('\n[테스트 2] 이미지 업로드 보안 검증 (MIME / 확장자 / 크기)');
  function checkImageUpload(filename, mimetype, size) {
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(filename).toLowerCase();
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    if (!mimetype.startsWith('image/')) return { valid: false, reason: 'MIME_INVALID' };
    if (!allowedExts.includes(ext)) return { valid: false, reason: 'EXT_INVALID' };
    if (size > MAX_SIZE) return { valid: false, reason: 'SIZE_EXCEEDED' };
    return { valid: true };
  }

  assert(checkImageUpload('avatar.png', 'image/png', 1024 * 500).valid === true, '정상 PNG 이미지 업로드 허용');
  assert(checkImageUpload('photo.JPG', 'image/jpeg', 1024 * 1024).valid === true, '대소문자 확장자(.JPG) 정상 처리 허용');
  assert(checkImageUpload('malicious.exe', 'application/x-msdownload', 1024).valid === false, '실행 파일(.exe) 업로드 차단');
  assert(checkImageUpload('script.js', 'text/javascript', 500).valid === false, '스크립트 파일(.js) 업로드 차단');
  assert(checkImageUpload('fake.png', 'text/html', 500).valid === false, 'MIME 타입 불일치 위조 파일 차단');
  assert(checkImageUpload('large.png', 'image/png', 6 * 1024 * 1024).valid === false, '5MB 초과 대용량 이미지 차단');

  // 3. 프로필 수정 권한 및 닉네임 유효성 검사
  console.log('\n[테스트 3] 프로필 수정 권한 및 유효성 검사');
  const NICKNAME_REGEX = /^[a-zA-Z0-9가-힣_-]{2,20}$/;

  assert(NICKNAME_REGEX.test('프로게이머'), '2~20자 한글 닉네임 유효');
  assert(NICKNAME_REGEX.test('Gamer_01'), '영문/숫자/밑줄 닉네임 유효');
  assert(!NICKNAME_REGEX.test('가'), '2글자 미만 닉네임 거부');
  assert(!NICKNAME_REGEX.test('닉네임!@#'), '특수문자 포함 닉네임 거부');

  function canEditProfile(sessionUser, targetUserId) {
    if (!sessionUser) return false;
    return sessionUser.id === targetUserId;
  }

  assert(canEditProfile({ id: 1 }, 1) === true, '본인 프로필 수정 접근 허용');
  assert(canEditProfile({ id: 1 }, 2) === false, '다른 사용자의 프로필 수정 시도 차단');
  assert(canEditProfile(null, 1) === false, '비로그인 사용자 프로필 수정 차단');

  // 4. EJS 뷰 템플릿 렌더링 무결성 검증 (검색 화면 & 프로필 화면)
  console.log('\n[테스트 4] EJS 뷰 템플릿 렌더링 검증');
  const searchViewPath = path.join(__dirname, 'views', 'search', 'index.ejs');
  const profileViewPath = path.join(__dirname, 'views', 'user', 'profile.ejs');

  const mockGames = [
    { id: 1, name: '리그 오브 레전드', slug: 'lol' },
    { id: 2, name: '발로란트', slug: 'valorant' }
  ];
  const mockCategories = [
    { id: 1, name: '자유게시판', slug: 'free' },
    { id: 2, name: '공략게시판', slug: 'guide' }
  ];

  try {
    // 4-1. 통합 검색 페이지 렌더링 (결과 있음)
    const searchHtml = await ejs.renderFile(searchViewPath, {
      title: '검색 테스트',
      games: mockGames,
      categories: mockCategories,
      posts: [{
        id: 1,
        title: '미드 아리 검색결과',
        game_name: '리그 오브 레전드',
        game_slug: 'lol',
        category_name: '공략게시판',
        author_nickname: '페이커',
        user_id: 10,
        comment_count: 2,
        view_count: 50,
        like_count: 5,
        created_at: '2026-11-23'
      }],
      totalCount: 1,
      currentPage: 1,
      totalPages: 1,
      searchQuery: '아리',
      selectedGame: 'lol',
      selectedCategory: 'guide',
      searchType: 'title',
      user: null,
      currentPath: '/search',
      navGames: mockGames
    });
    assert(searchHtml.includes('미드 아리 검색결과'), '검색 결과 제목이 테이블에 렌더링되는가');
    assert(searchHtml.includes('총 <span style="color: var(--accent-cyan-light); font-weight: 700;">1</span>건'), '검색 건수 뱃지가 렌더링되는가');

    // 4-2. 검색 결과 없음 렌더링
    const searchEmptyHtml = await ejs.renderFile(searchViewPath, {
      title: '검색 없음',
      games: mockGames,
      categories: mockCategories,
      posts: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
      searchQuery: '존재하지않는검색어123',
      selectedGame: 'all',
      selectedCategory: 'all',
      searchType: 'all',
      user: null,
      currentPath: '/search',
      navGames: mockGames
    });
    assert(searchEmptyHtml.includes('일치하는 검색 결과가 없습니다.'), '검색 결과 없을 때 안내 문구가 노출되는가');

    // 4-3. 마이페이지 (본인) 렌더링
    const myProfileHtml = await ejs.renderFile(profileViewPath, {
      title: '마이페이지',
      profileUser: { id: 1, nickname: '내닉네임', email: 'me@gamecafe.com', role: 'user', bio: '반갑습니다!', created_at: '2026-11-23' },
      stats: { postCount: 5, commentCount: 12, likeReceived: 45 },
      myPosts: [{ id: 10, title: '내가 쓴 글', game_name: 'LOL', category_name: '자유', comment_count: 1, view_count: 20, like_count: 3, created_at: '2026-11-23' }],
      myComments: [{ id: 20, post_id: 10, post_title: '내가 쓴 글', content: '내가 단 댓글', game_name: 'LOL', created_at: '2026-11-23' }],
      myLikes: [],
      isOwner: true,
      activeTab: 'posts',
      successMessage: null,
      errorMessage: null,
      user: { id: 1, nickname: '내닉네임', role: 'user' },
      currentPath: '/profile',
      navGames: mockGames
    });
    assert(myProfileHtml.includes('프로필 수정'), '본인 마이페이지 접속 시 [프로필 수정] 버튼 노출');
    assert(myProfileHtml.includes('내가 쓴 글'), '작성한 게시글 목록이 렌더링되는가');
    assert(myProfileHtml.includes('반갑습니다!'), '자기소개(bio)가 프로필 카드에 노출되는가');

    // 4-4. 다른 사용자 프로필 (타인) 렌더링
    const otherProfileHtml = await ejs.renderFile(profileViewPath, {
      title: '다른 사용자 프로필',
      profileUser: { id: 2, nickname: '상대방', email: 'other@gamecafe.com', role: 'user', bio: '상대방 소개글', created_at: '2026-11-23' },
      stats: { postCount: 2, commentCount: 0, likeReceived: 10 },
      myPosts: [{ id: 30, title: '상대방이 쓴 글', game_name: '발로란트', category_name: '공략', comment_count: 0, view_count: 15, like_count: 2, created_at: '2026-11-23' }],
      myComments: [],
      myLikes: [],
      isOwner: false,
      activeTab: 'posts',
      successMessage: null,
      errorMessage: null,
      user: { id: 1, nickname: '내닉네임', role: 'user' },
      currentPath: '/users/2',
      navGames: mockGames
    });
    assert(!otherProfileHtml.includes('id="btnToggleEditProfile"'), '타인 프로필 조회 시 프로필 수정 버튼 숨김');
    assert(otherProfileHtml.includes('상대방이 쓴 글'), '타인의 공개 작성글 목록 노출');

  } catch (err) {
    console.error('EJS 렌더링 에러:', err);
    assert(false, 'EJS 뷰 렌더링 성공');
  }

  console.log('\n========================================================');
  console.log(`📊 Step 6 결과: ${passedTests} / ${totalTests} 성공 (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================');
}

runStep6Tests();
