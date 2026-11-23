const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

// 이메일 정규식 (RFC 5322 간소화 버전)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 비밀번호 최소 길이
const MIN_PASSWORD_LENGTH = 6;
// 닉네임 길이 제한 (2~20자, 특수문자 제한)
const NICKNAME_REGEX = /^[a-zA-Z0-9가-힣_-]{2,20}$/;

const authController = {
  /**
   * GET /auth/register
   * 회원가입 폼 렌더링
   */
  getRegister(req, res) {
    res.render('auth/register', {
      title: '회원가입 | GameCafe',
      errorMessage: null,
      formData: {}
    });
  },

  /**
   * POST /auth/register
   * 회원가입 처리
   */
  async postRegister(req, res) {
    const { email, password, passwordConfirm, nickname } = req.body;
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedNickname = (nickname || '').trim();

    const formData = {
      email: trimmedEmail,
      nickname: trimmedNickname
    };

    // 1. 필수 입력값 검증
    if (!trimmedEmail || !password || !passwordConfirm || !trimmedNickname) {
      return res.render('auth/register', {
        title: '회원가입 | GameCafe',
        errorMessage: '모든 필수 항목을 입력해 주세요.',
        formData
      });
    }

    // 2. 이메일 형식 검증
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.render('auth/register', {
        title: '회원가입 | GameCafe',
        errorMessage: '유효한 이메일 주소 형식을 입력해 주세요.',
        formData
      });
    }

    // 3. 닉네임 유효성 검증 (2~20자, 한글/영문/숫자/_- 허용)
    if (!NICKNAME_REGEX.test(trimmedNickname)) {
      return res.render('auth/register', {
        title: '회원가입 | GameCafe',
        errorMessage: '닉네임은 2~20자의 한글, 영문, 숫자, 밑줄(_), 하이픈(-)만 사용할 수 있습니다.',
        formData
      });
    }

    // 4. 비밀번호 길이 검증
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.render('auth/register', {
        title: '회원가입 | GameCafe',
        errorMessage: `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
        formData
      });
    }

    // 5. 비밀번호 일치 확인
    if (password !== passwordConfirm) {
      return res.render('auth/register', {
        title: '회원가입 | GameCafe',
        errorMessage: '비밀번호와 비밀번호 확인이 일치하지 않습니다.',
        formData
      });
    }

    try {
      // 6. 이메일 중복 확인
      const existingUserByEmail = await userModel.findByEmail(trimmedEmail);
      if (existingUserByEmail) {
        return res.render('auth/register', {
          title: '회원가입 | GameCafe',
          errorMessage: '이미 가입된 이메일 주소입니다. 다른 이메일을 사용해 주세요.',
          formData
        });
      }

      // 7. 닉네임 중복 확인
      const existingUserByNickname = await userModel.findByNickname(trimmedNickname);
      if (existingUserByNickname) {
        return res.render('auth/register', {
          title: '회원가입 | GameCafe',
          errorMessage: '이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.',
          formData
        });
      }

      // 8. 비밀번호 bcrypt 해싱 (Salt 라운드: 10)
      const hashedPassword = await bcrypt.hash(password, 10);

      // 9. 데이터베이스 저장
      await userModel.createUser({
        email: trimmedEmail,
        password: hashedPassword,
        nickname: trimmedNickname,
        role: 'user'
      });

      // 가입 완료 후 성공 메시지와 함께 로그인 페이지로 리다이렉트
      return res.redirect('/auth/login?registered=success');
    } catch (error) {
      console.error('회원가입 데이터베이스 처리 오류:', error);
      return res.render('auth/register', {
        title: '회원가입 | GameCafe',
        errorMessage: '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        formData
      });
    }
  },

  /**
   * GET /auth/login
   * 로그인 폼 렌더링
   */
  getLogin(req, res) {
    let successMessage = null;
    let errorMessage = req.query.error || null;

    if (req.query.registered === 'success') {
      successMessage = '회원가입이 완료되었습니다! 로그인해 주세요.';
    }

    res.render('auth/login', {
      title: '로그인 | GameCafe',
      errorMessage,
      successMessage,
      email: ''
    });
  },

  /**
   * POST /auth/login
   * 로그인 처리 및 세션 생성
   */
  async postLogin(req, res) {
    const { email, password } = req.body;
    const trimmedEmail = (email || '').trim().toLowerCase();

    // 1. 입력값 검증
    if (!trimmedEmail || !password) {
      return res.render('auth/login', {
        title: '로그인 | GameCafe',
        errorMessage: '이메일과 비밀번호를 모두 입력해 주세요.',
        successMessage: null,
        email: trimmedEmail
      });
    }

    try {
      // 2. 사용자 조회
      const user = await userModel.findByEmail(trimmedEmail);
      if (!user) {
        return res.render('auth/login', {
          title: '로그인 | GameCafe',
          errorMessage: '가입되지 않은 이메일이거나 비밀번호가 일치하지 않습니다.',
          successMessage: null,
          email: trimmedEmail
        });
      }

      // 3. bcrypt 비밀번호 검증
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (!isPasswordMatch) {
        return res.render('auth/login', {
          title: '로그인 | GameCafe',
          errorMessage: '가입되지 않은 이메일이거나 비밀번호가 일치하지 않습니다.',
          successMessage: null,
          email: trimmedEmail
        });
      }

      // 4. 정지 회원 검증
      if (user.is_banned) {
        return res.render('auth/login', {
          title: '로그인 | GameCafe',
          errorMessage: '이용이 정지된 계정입니다. 관리자에게 문의해 주세요.',
          successMessage: null,
          email: trimmedEmail
        });
      }

      // 5. 로그인 성공 - 세션에 안전한 사용자 정보 저장 (비밀번호 제외)
      req.session.user = {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        profile_image: user.profile_image || '/images/default-avatar.png'
      };

      // 세션 저장 후 리다이렉트 (이전에 접근하려던 URL이 있으면 그쪽으로 이동)
      const redirectUrl = req.session.returnTo || '/';
      delete req.session.returnTo;

      req.session.save((err) => {
        if (err) {
          console.error('세션 저장 오류:', err);
        }
        return res.redirect(redirectUrl);
      });
    } catch (error) {
      console.error('로그인 데이터베이스 처리 오류:', error);
      return res.render('auth/login', {
        title: '로그인 | GameCafe',
        errorMessage: '로그인 처리 중 시스템 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        successMessage: null,
        email: trimmedEmail
      });
    }
  },

  /**
   * GET /auth/logout
   * 로그아웃 처리 및 세션 파기
   */
  logout(req, res) {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('로그아웃 세션 파기 오류:', err);
        }
        res.clearCookie('connect.sid'); // 세션 쿠키 삭제
        return res.redirect('/');
      });
    } else {
      return res.redirect('/');
    }
  }
};

module.exports = authController;
