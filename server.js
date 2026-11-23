require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const pool = require('./config/database');
const gameModel = require('./models/gameModel');
const homeRoutes = require('./routes/homeRoutes');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const apiRoutes = require('./routes/apiRoutes');
const searchRoutes = require('./routes/searchRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. 정적 파일 및 바디 파서 설정
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 3. 세션 보안 설정
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'gamecafe_default_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24시간
      httpOnly: true,              // XSS 세션 쿠키 탈취 방지
      sameSite: 'lax',             // CSRF 완화
      secure: process.env.NODE_ENV === 'production'
    }
  })
);

// 4. 전역 템플릿 변수 주입 미들웨어
let cachedNavGames = null;
app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;

  // 상단 헤더 메뉴에 표시할 게임 목록 (캐싱 적용)
  try {
    if (!cachedNavGames) {
      cachedNavGames = await gameModel.getAllGames();
    }
    res.locals.navGames = cachedNavGames;
  } catch (err) {
    res.locals.navGames = [];
  }

  next();
});

// 5. 라우터 마운트
app.use('/', homeRoutes);
app.use('/auth', authRoutes);
app.use('/search', searchRoutes);
app.use('/admin', adminRoutes);
app.use('/', userRoutes);
app.use('/', postRoutes);
app.use('/api', apiRoutes);

// 6. 404 에러 핸들러
app.use((req, res) => {
  res.status(404).render('index', {
    title: '404 - 페이지를 찾을 수 없습니다 | GameCafe',
    games: [],
    popularPosts: [],
    recentPosts: [],
    noticePosts: [],
    dbError: '요청하신 페이지가 존재하지 않습니다.'
  });
});

// 7. 500 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('서버 내부 에러:', err);
  res.status(500).send(`
    <div style="padding: 40px; font-family: sans-serif; background: #0f1117; color: #fff; min-height: 100vh;">
      <h2 style="color: #f43f5e;">500 Internal Server Error</h2>
      <p>서버 내부에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
      <pre style="background: #181c26; padding: 15px; border-radius: 8px; color: #94a3b8;">${err.message}</pre>
    </div>
  `);
});

// 8. 서버 구동
app.listen(PORT, () => {
  console.log('========================================================');
  console.log(`🚀 GameCafe 서버가 성공적으로 시작되었습니다!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🎮 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================================');
});
