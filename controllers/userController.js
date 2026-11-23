const userModel = require('../models/userModel');
const postModel = require('../models/postModel');
const commentModel = require('../models/commentModel');

const NICKNAME_REGEX = /^[a-zA-Z0-9가-힣_-]{2,20}$/;

const userController = {
  /**
   * GET /profile
   * 로그인한 사용자 본인의 마이페이지
   */
  async getMyProfile(req, res) {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }

    const userId = req.session.user.id;
    const { tab } = req.query; // 'posts', 'comments', 'likes'
    const activeTab = tab || 'posts';

    try {
      const [user, stats, myPosts, myComments, myLikes] = await Promise.all([
        userModel.findById(userId),
        userModel.getUserStats(userId),
        postModel.getPostsByUserId(userId, 20),
        commentModel.getCommentsByUserId(userId, 20),
        postModel.getLikedPostsByUserId(userId, 20)
      ]);

      if (!user) {
        return res.redirect('/auth/logout');
      }

      res.render('user/profile', {
        title: '마이페이지 | GameCafe',
        profileUser: user,
        stats,
        myPosts,
        myComments,
        myLikes,
        isOwner: true,
        activeTab,
        successMessage: req.query.updated === 'success' ? '프로필 정보가 성공적으로 수정되었습니다.' : null,
        errorMessage: req.query.error || null
      });
    } catch (error) {
      console.error('마이페이지 로드 오류:', error);
      res.redirect('/');
    }
  },

  /**
   * POST /profile/edit
   * 내 프로필 정보(닉네임, 자기소개, 프로필 이미지) 수정
   */
  async updateProfile(req, res) {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }

    const userId = req.session.user.id;
    const { nickname, bio } = req.body;
    const trimmedNickname = (nickname || '').trim();
    const trimmedBio = (bio || '').trim();

    // 1. 닉네임 유효성 검사
    if (!trimmedNickname || !NICKNAME_REGEX.test(trimmedNickname)) {
      return res.redirect('/profile?error=' + encodeURIComponent('닉네임은 2~20자의 한글, 영문, 숫자, 밑줄, 하이픈만 사용할 수 있습니다.'));
    }

    try {
      // 2. 닉네임 중복 검사 (현재 본인의 닉네임이 아닌 경우에만 확인)
      const currentUser = await userModel.findById(userId);
      if (currentUser.nickname !== trimmedNickname) {
        const existingUser = await userModel.findByNickname(trimmedNickname);
        if (existingUser) {
          return res.redirect('/profile?error=' + encodeURIComponent('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해 주세요.'));
        }
      }

      // 3. 프로필 이미지 업로드 경로 확인
      let profileImageUrl = null;
      if (req.file) {
        profileImageUrl = `/uploads/profiles/${req.file.filename}`;
      }

      // 4. DB 업데이트
      await userModel.updateProfile(userId, {
        nickname: trimmedNickname,
        bio: trimmedBio,
        profile_image: profileImageUrl
      });

      // 5. 세션 동기화
      req.session.user.nickname = trimmedNickname;
      if (profileImageUrl) {
        req.session.user.profile_image = profileImageUrl;
      }

      req.session.save(() => {
        return res.redirect('/profile?updated=success');
      });
    } catch (error) {
      console.error('프로필 수정 중 오류:', error);
      return res.redirect('/profile?error=' + encodeURIComponent('프로필 수정 중 시스템 오류가 발생했습니다.'));
    }
  },

  /**
   * GET /users/:id
   * 다른 사용자의 공개 프로필 조회
   */
  async getUserProfile(req, res) {
    const targetUserId = parseInt(req.params.id, 10);

    // 본인 프로필이면 마이페이지로 리다이렉트
    if (req.session.user && req.session.user.id === targetUserId) {
      return res.redirect('/profile');
    }

    try {
      const [targetUser, stats, userPosts] = await Promise.all([
        userModel.findById(targetUserId),
        userModel.getUserStats(targetUserId),
        postModel.getPostsByUserId(targetUserId, 20)
      ]);

      if (!targetUser) {
        return res.status(404).render('index', {
          title: '사용자를 찾을 수 없습니다 | GameCafe',
          games: [],
          popularPosts: [],
          recentPosts: [],
          noticePosts: [],
          dbError: '해당 사용자가 존재하지 않습니다.'
        });
      }

      res.render('user/profile', {
        title: `${targetUser.nickname} 님의 프로필 | GameCafe`,
        profileUser: targetUser,
        stats,
        myPosts: userPosts,
        myComments: [],
        myLikes: [],
        isOwner: false,
        activeTab: 'posts',
        successMessage: null,
        errorMessage: null
      });
    } catch (error) {
      console.error('다른 사용자 프로필 조회 오류:', error);
      res.redirect('/');
    }
  }
};

module.exports = userController;
