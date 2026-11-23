const bcrypt = require('bcrypt');
const path = require('path');
const ejs = require('ejs');

async function runAuthTests() {
  console.log('========================================================');
  console.log('🧪 GameCafe Step 3 회원 인증 시스템 단위 테스트');
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

  // 1. bcrypt 단방향 암호화 및 비밀번호 검증 테스트
  console.log('\n[테스트 1] bcrypt 비밀번호 해싱 및 일치성 검증');
  const plainPassword = 'securePassword123!';
  const wrongPassword = 'wrongPassword456!';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  assert(hashedPassword.startsWith('$2b$10$'), 'bcrypt 해시 형식이 올바른가 ($2b$10$...)');
  assert(hashedPassword !== plainPassword, '비밀번호 원문이 해시와 완전히 다른가');
  
  const isMatchCorrect = await bcrypt.compare(plainPassword, hashedPassword);
  assert(isMatchCorrect === true, '정확한 비밀번호로 compare 시 true 반환');

  const isMatchWrong = await bcrypt.compare(wrongPassword, hashedPassword);
  assert(isMatchWrong === false, '틀린 비밀번호로 compare 시 false 반환');

  // 2. 이메일 및 닉네임 유효성 검사 규칙 테스트
  console.log('\n[테스트 2] 회원가입 입력값 유효성 검사 규칙');
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const NICKNAME_REGEX = /^[a-zA-Z0-9가-힣_-]{2,20}$/;

  assert(EMAIL_REGEX.test('gamer@gamecafe.com'), '정상 이메일 통과');
  assert(!EMAIL_REGEX.test('not-an-email'), '비정상 이메일 거부');
  assert(!EMAIL_REGEX.test('gamer@'), '도메인 없는 이메일 거부');

  assert(NICKNAME_REGEX.test('페이커'), '한글 닉네임 통과');
  assert(NICKNAME_REGEX.test('gamer_123'), '영문/숫자/밑줄 닉네임 통과');
  assert(!NICKNAME_REGEX.test('a'), '2글자 미만 닉네임 거부');
  assert(!NICKNAME_REGEX.test('very_very_long_nickname_over_20_characters'), '20글자 초과 닉네임 거부');
  assert(!NICKNAME_REGEX.test('gamer!@#'), '특수문자 포함 닉네임 거부');

  // 3. EJS 뷰 템플릿 렌더링 테스트 (로그인, 회원가입, 헤더 분기)
  console.log('\n[테스트 3] EJS 뷰 템플릿 렌더링 무결성 검증');
  const loginViewPath = path.join(__dirname, 'views', 'auth', 'login.ejs');
  const registerViewPath = path.join(__dirname, 'views', 'auth', 'register.ejs');
  const headerViewPath = path.join(__dirname, 'views', 'partials', 'header.ejs');

  try {
    // 3-1. 로그인 페이지 렌더링
    const loginHtml = await ejs.renderFile(loginViewPath, {
      title: '로그인 테스트',
      errorMessage: '비밀번호가 일치하지 않습니다.',
      successMessage: null,
      email: 'test@gamecafe.com',
      user: null,
      currentPath: '/auth/login',
      navGames: []
    });
    assert(loginHtml.includes('비밀번호가 일치하지 않습니다.'), '로그인 에러 메시지가 화면에 올바르게 렌더링되는가');
    assert(loginHtml.includes('test@gamecafe.com'), '이전 입력 이메일이 보존되어 렌더링되는가');

    // 3-2. 회원가입 페이지 렌더링
    const registerHtml = await ejs.renderFile(registerViewPath, {
      title: '회원가입 테스트',
      errorMessage: '이미 사용 중인 닉네임입니다.',
      formData: { email: 'new@gamecafe.com', nickname: '중복닉' },
      user: null,
      currentPath: '/auth/register',
      navGames: []
    });
    assert(registerHtml.includes('이미 사용 중인 닉네임입니다.'), '회원가입 에러 메시지가 화면에 올바르게 렌더링되는가');
    assert(registerHtml.includes('new@gamecafe.com'), '회원가입 입력 데이터가 폼에 보존되는가');

    // 3-3. 헤더: 비로그인 상태 vs 로그인 상태(일반) vs 관리자 상태
    const guestHeader = await ejs.renderFile(headerViewPath, { user: null, currentPath: '/', navGames: [] });
    assert(guestHeader.includes('로그인') && guestHeader.includes('회원가입'), '비로그인 시 [로그인/회원가입] 버튼 노출');

    const userHeader = await ejs.renderFile(headerViewPath, {
      user: { id: 1, nickname: '테스터', role: 'user', email: 'user@gamecafe.com' },
      currentPath: '/',
      navGames: []
    });
    assert(userHeader.includes('테스터') && userHeader.includes('로그아웃'), '로그인 시 [닉네임] 및 [로그아웃] 버튼 노출');

    const adminHeader = await ejs.renderFile(headerViewPath, {
      user: { id: 99, nickname: '최고관리자', role: 'admin', email: 'admin@gamecafe.com' },
      currentPath: '/',
      navGames: []
    });
    assert(adminHeader.includes('ADMIN'), '관리자 로그인 시 [ADMIN] 뱃지 노출');

  } catch (renderError) {
    console.error('뷰 렌더링 중 오류 발생:', renderError);
    assert(false, 'EJS 뷰 렌더링 성공');
  }

  // 4. authMiddleware 권한 가드 로직 테스트
  console.log('\n[테스트 4] 미들웨어 접근 제어(가드) 테스트');
  const { isAuthenticated, isGuest, isAdmin } = require('./middlewares/authMiddleware');

  // isAuthenticated 테스트
  let authPassed = false;
  let authRedirectUrl = '';
  isAuthenticated({ session: { user: { id: 1 } }, originalUrl: '/protected' }, { redirect: (url) => { authRedirectUrl = url; } }, () => { authPassed = true; });
  assert(authPassed === true, '로그인 세션 존재 시 isAuthenticated 통과');

  authPassed = false;
  isAuthenticated({ session: {}, originalUrl: '/protected' }, { redirect: (url) => { authRedirectUrl = url; } }, () => { authPassed = true; });
  assert(authPassed === false && authRedirectUrl.includes('/auth/login'), '비로그인 시 isAuthenticated 가드가 로그인으로 리다이렉트');

  // isGuest 테스트
  let guestPassed = false;
  isGuest({ session: { user: { id: 1 } } }, { redirect: () => {} }, () => { guestPassed = true; });
  assert(guestPassed === false, '로그인 상태에서 isGuest 진입 차단 (홈 리다이렉트)');

  guestPassed = false;
  isGuest({ session: {} }, { redirect: () => {} }, () => { guestPassed = true; });
  assert(guestPassed === true, '비로그인 상태에서 isGuest 정상 통과');

  // isAdmin 테스트
  let adminPassed = false;
  isAdmin({ session: { user: { role: 'admin' } } }, {}, () => { adminPassed = true; });
  assert(adminPassed === true, 'admin role을 가진 유저가 isAdmin 통과');

  let adminBlocked = false;
  isAdmin({ session: { user: { role: 'user' } } }, { status: () => ({ render: () => { adminBlocked = true; } }) }, () => {});
  assert(adminBlocked === true, '일반 유저는 isAdmin에서 403 차단');

  console.log('\n========================================================');
  console.log(`📊 테스트 결과: ${passedTests} / ${totalTests} 성공 (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================');
}

runAuthTests();
