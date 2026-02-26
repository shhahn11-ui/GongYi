import { getCurrentUser, logout, onAuthChange } from './auth.js';

const ADMIN_EMAIL = 'shhahn11@gmail.com';

export function isAdminUser(user = getCurrentUser()) {
  return Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL);
}

export function initializeHeader() {
  const currentUser = getCurrentUser();
  const headerNav = document.getElementById('navMenu') || document.querySelector('.nav-menu');

  if (!headerNav) {
    console.error('네비게이션 메뉴를 찾을 수 없습니다.');
    return;
  }

  // 기존 내용 초기화
  headerNav.innerHTML = '';

  if (currentUser) {
    // 로그인된 상태
    const navItems = [
      { text: '개인 리스트', href: 'dashboard.html' },
      { text: '리스트 공유', href: 'shared-lists.html' },
      { text: '내 프로필', href: 'profile.html' }
    ];

    if (isAdminUser(currentUser)) {
      navItems.splice(2, 0, { text: '관리자탭', href: 'admin.html' });
    }

    navItems.forEach(item => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.text;
      a.addEventListener('click', () => {
        // 링크 클릭 시 메뉴 닫기 (모바일에서)
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        if (hamburgerBtn) hamburgerBtn.classList.remove('active');
        headerNav.classList.remove('active');
      });
      li.appendChild(a);
      headerNav.appendChild(li);
    });

    // 로그아웃 버튼
    const logoutLi = document.createElement('li');
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn-logout';
    logoutBtn.textContent = '로그아웃';
    logoutBtn.addEventListener('click', async () => {
      try {
        await logout();
        window.location.href = 'index.html';
      } catch (error) {
        alert('로그아웃 실패: ' + error.message);
      }
    });
    logoutLi.appendChild(logoutBtn);
    headerNav.appendChild(logoutLi);
  } else {
    // 로그인되지 않은 상태
    const loginLi = document.createElement('li');
    const loginA = document.createElement('a');
    loginA.href = 'index.html';
    loginA.className = 'auth-link';
    loginA.textContent = '로그인';
    loginLi.appendChild(loginA);
    headerNav.appendChild(loginLi);

    const signupLi = document.createElement('li');
    const signupA = document.createElement('a');
    signupA.href = 'signup.html';
    signupA.className = 'auth-link';
    signupA.textContent = '회원가입';
    signupLi.appendChild(signupA);
    headerNav.appendChild(signupLi);
  }
}

export function checkAuthAndRedirect() {
  const currentUser = getCurrentUser();
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const publicPages = ['index.html', 'signup.html'];

  if (!currentUser && !publicPages.includes(currentPage)) {
    // 로그인하지 않았는데 보호된 페이지 접근
    window.location.href = 'index.html';
  }

  if (currentUser && (currentPage === 'index.html' || currentPage === 'signup.html')) {
    // 이미 로그인했는데 인증 페이지 접근
    window.location.href = 'dashboard.html';
  }

  if (currentUser && currentPage === 'admin.html' && !isAdminUser(currentUser)) {
    window.location.href = 'dashboard.html';
  }
}

// 보호된 페이지에서 사용: 로그인 없으면 로그인 페이지로 이동
export function enforceAuthPage(redirectTo = 'index.html') {
  const currentUser = getCurrentUser();
  if (currentUser) return;

  onAuthChange(user => {
    if (!user) {
      window.location.href = redirectTo;
    }
  });
}
