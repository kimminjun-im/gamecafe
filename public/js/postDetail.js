/**
 * GameCafe Post Detail Client-side Script
 * 1. 실시간 AJAX 좋아요 토글
 * 2. 대댓글(답글) 작성 폼 토글
 * 3. 댓글 인라인 수정 처리
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 실시간 비동기 좋아요(추천) 처리
  const btnLike = document.getElementById('btnLike');
  if (btnLike) {
    btnLike.addEventListener('click', async () => {
      const postId = btnLike.getAttribute('data-post-id');
      if (!postId) return;

      try {
        const response = await fetch(`/api/posts/${postId}/like`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (response.status === 401) {
          alert('로그인이 필요한 기능입니다. 로그인 후 이용해 주세요.');
          window.location.href = '/auth/login';
          return;
        }

        const data = await response.json();
        if (data.success) {
          const likeCountEl = document.getElementById('likeCount');
          const likeIcon = btnLike.querySelector('.like-icon');

          if (likeCountEl) {
            likeCountEl.textContent = data.likeCount;
          }

          if (data.liked) {
            btnLike.classList.add('liked');
            if (likeIcon) likeIcon.setAttribute('fill', 'currentColor');
          } else {
            btnLike.classList.remove('liked');
            if (likeIcon) likeIcon.setAttribute('fill', 'none');
          }
        } else {
          alert(data.message || '좋아요 처리 중 오류가 발생했습니다.');
        }
      } catch (err) {
        console.error('좋아요 요청 에러:', err);
        alert('서버와 통신할 수 없습니다.');
      }
    });
  }

  // 2. 대댓글(답글) 작성 폼 토글
  document.querySelectorAll('.btn-reply-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const commentId = btn.getAttribute('data-comment-id');
      const replyBox = document.getElementById(`reply-box-${commentId}`);
      if (replyBox) {
        replyBox.style.display = replyBox.style.display === 'none' ? 'block' : 'none';
        if (replyBox.style.display === 'block') {
          const textarea = replyBox.querySelector('textarea');
          if (textarea) textarea.focus();
        }
      }
    });
  });

  document.querySelectorAll('.btn-cancel-reply').forEach(btn => {
    btn.addEventListener('click', () => {
      const commentId = btn.getAttribute('data-comment-id');
      const replyBox = document.getElementById(`reply-box-${commentId}`);
      if (replyBox) {
        replyBox.style.display = 'none';
      }
    });
  });

  // 3. 댓글 인라인 수정 토글 및 비동기 처리
  document.querySelectorAll('.btn-edit-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const commentId = btn.getAttribute('data-comment-id');
      const contentEl = document.getElementById(`comment-text-${commentId}`);
      const editForm = document.getElementById(`edit-form-${commentId}`);

      if (contentEl && editForm) {
        contentEl.style.display = 'none';
        editForm.style.display = 'block';
        const textarea = editForm.querySelector('textarea');
        if (textarea) textarea.focus();
      }
    });
  });

  document.querySelectorAll('.btn-cancel-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const commentId = btn.getAttribute('data-comment-id');
      const contentEl = document.getElementById(`comment-text-${commentId}`);
      const editForm = document.getElementById(`edit-form-${commentId}`);

      if (contentEl && editForm) {
        contentEl.style.display = 'block';
        editForm.style.display = 'none';
      }
    });
  });

  document.querySelectorAll('.btn-submit-edit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const commentId = btn.getAttribute('data-comment-id');
      const editForm = document.getElementById(`edit-form-${commentId}`);
      const contentEl = document.getElementById(`comment-text-${commentId}`);
      const textarea = editForm ? editForm.querySelector('textarea') : null;

      if (!textarea || !textarea.value.trim()) {
        alert('수정할 내용을 입력해 주세요.');
        return;
      }

      try {
        const response = await fetch(`/api/comments/${commentId}/edit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ content: textarea.value.trim() })
        });

        const data = await response.json();
        if (data.success) {
          if (contentEl) {
            contentEl.textContent = data.content;
            contentEl.style.display = 'block';
          }
          if (editForm) {
            editForm.style.display = 'none';
          }
        } else {
          alert(data.message || '댓글 수정에 실패했습니다.');
        }
      } catch (err) {
        console.error('댓글 수정 에러:', err);
        alert('서버와 통신할 수 없습니다.');
      }
    });
  });
});
