/**
 * GameCafe Client-side Scripts
 * 모바일 드로어 토글 및 상호작용 스크립트
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 모바일 햄버거 메뉴 토글
  const mobileToggleBtn = document.querySelector('.btn-mobile-menu');
  const mobileDrawer = document.querySelector('.mobile-drawer');
  const drawerOverlay = document.querySelector('.drawer-overlay');
  const drawerCloseBtn = document.querySelector('.drawer-close');

  function openDrawer() {
    if (mobileDrawer && drawerOverlay) {
      mobileDrawer.classList.add('active');
      drawerOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDrawer() {
    if (mobileDrawer && drawerOverlay) {
      mobileDrawer.classList.remove('active');
      drawerOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', openDrawer);
  }
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeDrawer);
  }
  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', closeDrawer);
  }

  // 2. ESC 키 입력 시 드로어 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDrawer();
    }
  });
});
