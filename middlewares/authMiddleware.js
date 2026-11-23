/**
 * Authentication & Authorization Middlewares
 * 사용자 접근 제어 및 권한 검증 미들웨어
 */

/**
 * 1. 로그인 필수 가드
 * - 비로그인 상태에서 보호된 페이지 접근 시 로그인 페이지로 리다이렉트
 */
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  // 로그인 후 원래 가려던 페이지로 돌아올 수 있도록 URL 저장 가능
  req.session.returnTo = req.originalUrl;
  return res.redirect('/auth/login?error=' + encodeURIComponent('로그인이 필요한 서비스입니다.'));
}

/**
 * 2. 게스트(비로그인 사용자) 전용 가드
 * - 이미 로그인한 사용자가 로그인/회원가입 페이지에 접근 시 메인 페이지로 리다이렉트
 */
function isGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  return next();
}

/**
 * 3. 관리자 권한 가드
 * - DB role이 'admin'인 사용자만 통과
 */
function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).render('index', {
    title: '403 접근 권한 없음 | GameCafe',
    games: [],
    popularPosts: [],
    recentPosts: [],
    noticePosts: [],
    dbError: '접근 권한이 없습니다. 관리자만 이용할 수 있습니다.'
  });
}

module.exports = {
  isAuthenticated,
  isGuest,
  isAdmin
};
