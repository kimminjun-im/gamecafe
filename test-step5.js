const path = require('path');
const ejs = require('ejs');

async function runStep5Tests() {
  console.log('========================================================');
  console.log('🧪 GameCafe Step 5 댓글, 대댓글, 좋아요 시스템 단위 테스트');
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

  // 1. 계층형 댓글 트리 구성 알고리즘 테스트
  console.log('\n[테스트 1] 계층형 댓글 트리 구조화 및 대댓글 보존 로직');
  const rawComments = [
    { id: 1, post_id: 10, user_id: 1, parent_id: null, content: '원댓글 1입니다.', is_deleted: 0, author_nickname: '유저1', created_at: '2026-11-23' },
    { id: 2, post_id: 10, user_id: 2, parent_id: 1, content: '원댓글 1의 대댓글 1', is_deleted: 0, author_nickname: '유저2', created_at: '2026-11-23' },
    { id: 3, post_id: 10, user_id: 3, parent_id: 1, content: '원댓글 1의 대댓글 2', is_deleted: 0, author_nickname: '유저3', created_at: '2026-11-23' },
    { id: 4, post_id: 10, user_id: 1, parent_id: null, content: '삭제된 댓글입니다.', is_deleted: 1, author_nickname: '유저1', created_at: '2026-11-23' },
    { id: 5, post_id: 10, user_id: 4, parent_id: 4, content: '삭제된 부모 밑에 달린 대댓글', is_deleted: 0, author_nickname: '유저4', created_at: '2026-11-23' }
  ];

  function buildCommentTree(flatList) {
    const map = new Map();
    const roots = [];
    flatList.forEach(c => {
      c.replies = [];
      map.set(c.id, c);
    });
    flatList.forEach(c => {
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id).replies.push(c);
      } else {
        roots.push(c);
      }
    });
    return roots;
  }

  const tree = buildCommentTree(rawComments);
  assert(tree.length === 2, '최상위 부모 댓글이 정확히 2개로 그룹화되는가');
  assert(tree[0].replies.length === 2, '원댓글 1번에 대댓글 2개가 올바르게 연결되는가');
  assert(tree[1].is_deleted === 1, '부모 댓글 4번이 소프트 삭제 상태를 유지하는가');
  assert(tree[1].replies.length === 1, '부모 댓글 4번이 삭제되어도 하위 대댓글(5번)이 보존되는가');

  // 2. EJS 뷰 렌더링 무결성 검증 (좋아요 상태 + 댓글/대댓글 트리)
  console.log('\n[테스트 2] EJS 뷰 템플릿 렌더링 검증');
  const detailViewPath = path.join(__dirname, 'views', 'post', 'detail.ejs');
  const mockPost = {
    id: 10,
    game_name: '리그 오브 레전드',
    game_slug: 'lol',
    category_name: '공략게시판',
    author_nickname: '페이커',
    author_role: 'user',
    title: '미드 아리 룬/템트리 공략',
    content: '상세 공략 본문입니다.',
    view_count: 120,
    like_count: 35,
    comment_count: 5,
    notice_type: 'none',
    created_at: '2026-11-23 15:00:00'
  };

  try {
    // 2-1. 비로그인 + 미추천 상태 렌더링
    const htmlVisitor = await ejs.renderFile(detailViewPath, {
      title: '게시글 상세',
      post: mockPost,
      comments: tree,
      isLiked: false,
      canEditOrDelete: false,
      user: null,
      currentPath: '/posts/10',
      navGames: []
    });
    assert(htmlVisitor.includes('좋아요'), '좋아요 버튼이 정상 렌더링되는가');
    assert(htmlVisitor.includes('35</span>'), '게시글 좋아요 수가 렌더링되는가');
    assert(htmlVisitor.includes('원댓글 1의 대댓글 1'), '대댓글이 화면에 렌더링되는가');
    assert(htmlVisitor.includes('작성자에 의해 삭제된 댓글입니다.'), '삭제된 부모 댓글 안내 문구가 렌더링되는가');
    assert(htmlVisitor.includes('댓글을 작성하려면 로그인이 필요합니다.'), '비로그인 사용자 댓글 작성 안내가 노출되는가');

    // 2-2. 로그인 + 추천 완료 상태 렌더링
    const htmlLikedUser = await ejs.renderFile(detailViewPath, {
      title: '게시글 상세',
      post: mockPost,
      comments: tree,
      isLiked: true,
      canEditOrDelete: true,
      user: { id: 1, nickname: '유저1', role: 'user' },
      currentPath: '/posts/10',
      navGames: []
    });
    assert(htmlLikedUser.includes('btn-like liked'), '추천한 사용자에게 liked 활성 클래스가 부여되는가');
    assert(htmlLikedUser.includes('class="btn-reply-toggle"'), '로그인 사용자에게 답글 작성 버튼이 노출되는가');

  } catch (err) {
    console.error('EJS 렌더링 에러:', err);
    assert(false, 'EJS 뷰 템플릿 렌더링 성공');
  }

  // 3. 권한 검사 비즈니스 로직 테스트 (댓글 수정/삭제)
  console.log('\n[테스트 3] 댓글 수정 및 삭제 서버 사이드 권한 검사');
  function checkCommentUpdateAuth(user, comment) {
    if (!user) return false;
    if (comment.is_deleted) return false;
    return user.id === comment.user_id;
  }

  function checkCommentDeleteAuth(user, comment) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.id === comment.user_id;
  }

  const commentOwner = { id: 1, role: 'user' };
  const otherUser = { id: 2, role: 'user' };
  const adminUser = { id: 99, role: 'admin' };
  const targetComment = { id: 1, user_id: 1, is_deleted: 0 };
  const deletedComment = { id: 4, user_id: 1, is_deleted: 1 };

  assert(checkCommentUpdateAuth(commentOwner, targetComment) === true, '작성자 본인은 댓글 수정 허용');
  assert(checkCommentUpdateAuth(otherUser, targetComment) === false, '타인의 댓글 수정 시도 차단');
  assert(checkCommentUpdateAuth(commentOwner, deletedComment) === false, '이미 삭제된 댓글의 수정 시도 차단');

  assert(checkCommentDeleteAuth(commentOwner, targetComment) === true, '작성자 본인은 댓글 삭제 허용');
  assert(checkCommentDeleteAuth(otherUser, targetComment) === false, '일반 유저는 타인의 댓글 삭제 불가');
  assert(checkCommentDeleteAuth(adminUser, targetComment) === true, '관리자는 타인의 댓글도 삭제 허용');

  // 4. 좋아요 토글 시뮬레이션 및 데이터 정합성 검증
  console.log('\n[테스트 4] 좋아요 중복 방지 및 토글 로직 시뮬레이션');
  const mockLikesTable = new Set(); // (postId, userId) 복합 고유키 시뮬레이션

  function simulateToggleLike(postId, userId) {
    const key = `${postId}_${userId}`;
    let liked = false;
    if (mockLikesTable.has(key)) {
      mockLikesTable.delete(key);
      liked = false;
    } else {
      mockLikesTable.add(key);
      liked = true;
    }
    return { liked, currentLikes: mockLikesTable.size };
  }

  const firstClick = simulateToggleLike(10, 1);
  assert(firstClick.liked === true && firstClick.currentLikes === 1, '최초 클릭 시 좋아요 추가 (liked: true, count: 1)');

  const secondClick = simulateToggleLike(10, 1);
  assert(secondClick.liked === false && secondClick.currentLikes === 0, '동일 유저 재클릭 시 좋아요 취소 (liked: false, count: 0)');

  simulateToggleLike(10, 1);
  const otherClick = simulateToggleLike(10, 2);
  assert(otherClick.liked === true && otherClick.currentLikes === 2, '다른 유저 클릭 시 각각 카운트 누적 (count: 2)');

  console.log('\n========================================================');
  console.log(`📊 테스트 결과: ${passedTests} / ${totalTests} 성공 (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================');
}

runStep5Tests();
