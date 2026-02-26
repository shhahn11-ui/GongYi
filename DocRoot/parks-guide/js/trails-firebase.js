// Firebase 기반 산책로 업로드/표시 스크립트
// Firestore를 사용하며, 업로드 후 14일 지난 문서는 자동 정리됩니다.
// TODO: 아래 firebaseConfig를 실제 값으로 채워주세요.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  where,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyChH8O2bTwYB2lpWi7myiwc9HtrR-XcVj8',
  authDomain: 'parks-guide.firebaseapp.com',
  projectId: 'parks-guide',
  storageBucket: 'parks-guide.firebasestorage.app',
  messagingSenderId: '968121922343',
  appId: '1:968121922343:web:3c372b8e6153aaaebb2f02',
  measurementId: 'G-1D2P2BCLBK'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const trailForm = document.getElementById('trail-form');
const trailNameInput = document.getElementById('trail-name');
const trailTypeInput = document.getElementById('trail-type');
const trailDistanceInput = document.getElementById('trail-distance');
const trailNotesInput = document.getElementById('trail-notes');
const trailsGrid = document.getElementById('trails-list');
const trailsHint = document.getElementById('trails-hint');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authLocation = document.getElementById('auth-location');
const authLoginBtn = document.getElementById('auth-login');
const authSignupBtn = document.getElementById('auth-signup');
const authLogoutBtn = document.getElementById('auth-logout');
const authStatus = document.getElementById('auth-status');
const authGate = document.getElementById('auth-gate');
const profileEmail = document.getElementById('profile-email');
const profileLocation = document.getElementById('profile-location');
const profileStatus = document.getElementById('profile-status');
const profileForm = document.getElementById('profile-location-form');
const profileLocationInput = document.getElementById('profile-location-input');
const profileLogoutBtn = document.getElementById('profile-logout-btn');

const trailsCol = collection(db, 'userTrails');
const DAY_MS = 24 * 60 * 60 * 1000;
const TTL_MS = 14 * DAY_MS;
const auth = getAuth(app);
const profilesCol = collection(db, 'userProfiles');

// 초기 상태에서는 인증 전제
document.body.classList.add('locked');

const includesSportWord = name => {
  if (!name) return false;
  const lower = name.toLowerCase();
  return /농구|basketball|축구|soccer|풋살|futsal|야구|baseball|테니스|tennis|배드민턴|badminton|볼링|bowling/.test(lower);
};

const formatDistance = text => text?.trim() || '거리 정보 없음';

const formatDate = ts => {
  if (!ts) return '날짜 정보 없음';
  const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString();
};

const geocodeLocation = async text => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'ko' } });
  if (!res.ok) throw new Error('지오코딩 실패');
  const data = await res.json();
  if (!data.length) throw new Error('위치를 찾지 못했습니다');
  const { lat, lon } = data[0];
  return { lat: Number(lat), lon: Number(lon) };
};

const renderTrails = trails => {
  if (!trailsGrid) return;
  trailsGrid.innerHTML = '';

  if (!trails.length) {
    trailsHint.textContent = '업로드된 코스가 없습니다. 직접 추가해 보세요.';
    return;
  }

  trailsHint.textContent = `업로드된 코스 ${trails.length}개 (14일 보관)`;

  trails.forEach(trail => {
    const isOwner = auth.currentUser && trail.ownerUid === auth.currentUser.uid;
    const card = document.createElement('article');
    card.className = 'trail-card';
    card.innerHTML = `
      <div class="trail-head">
        <span class="pill blue">${formatDistance(trail.distance)}</span>
        <span class="distance">${trail.type}</span>
        ${isOwner ? '<span class="pill">내 코스</span>' : ''}
      </div>
      <h3>${trail.name}</h3>
      <p>${trail.notes || '설명이 없습니다.'}</p>
      <ul class="bullet-list">
        <li>업로드: ${formatDate(trail.createdAt)}</li>
        <li>14일 후 자동 삭제</li>
      </ul>
      ${isOwner ? `<div class="trail-actions"><button class="btn ghost btn-mini trail-delete" data-id="${trail.id}" data-owner="${trail.ownerUid}">삭제</button></div>` : ''}
    `;
    trailsGrid.appendChild(card);
  });
};

const cleanupOldTrails = async () => {
  const cutoff = new Date(Date.now() - TTL_MS);
  const staleQuery = query(trailsCol, where('createdAt', '<', Timestamp.fromDate(cutoff)));
  const snap = await getDocs(staleQuery);
  const deletions = snap.docs.map(d => deleteDoc(doc(db, 'userTrails', d.id)));
  await Promise.all(deletions);
};

const fetchTrails = async () => {
  if (!trailsGrid) return;
  trailsHint.textContent = '코스를 불러오는 중입니다…';
  try {
    await cleanupOldTrails();
    const q = query(trailsCol, orderBy('createdAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    const trails = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTrails(trails);
  } catch (err) {
    console.error(err);
    trailsHint.textContent = '코스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
  }
};

const handleSubmit = async e => {
  e.preventDefault();
  if (!trailForm) return;
  const user = auth.currentUser;
  if (!user) {
    trailsHint.textContent = '로그인 후 업로드할 수 있습니다.';
    return;
  }
  const name = trailNameInput.value.trim();
  const type = trailTypeInput.value.trim();
  const distance = trailDistanceInput.value.trim();
  const notes = trailNotesInput.value.trim();

  if (!name || !type) return;
  if (includesSportWord(name)) {
    trailsHint.textContent = '스포츠 시설 이름이 포함된 코스는 등록할 수 없습니다.';
    return;
  }

  trailsHint.textContent = '업로드 중입니다…';

  try {
    await addDoc(trailsCol, {
      name,
      type,
      distance: formatDistance(distance),
      notes,
      createdAt: serverTimestamp(),
      ownerUid: user.uid,
      ownerEmail: user.email || '익명'
    });
    trailForm.reset();
    trailTypeInput.value = '산책로';
    trailsHint.textContent = '업로드 완료! 목록을 새로고침합니다.';
    await fetchTrails();
  } catch (err) {
    console.error(err);
    trailsHint.textContent = '업로드에 실패했습니다. 설정과 네트워크를 확인해주세요.';
  }
};

const saveProfile = async (user, locationText, coords) => {
  if (!user) return;
  await setDoc(doc(profilesCol, user.uid), {
    email: user.email || '익명',
    location: locationText,
    coords,
    createdAt: serverTimestamp()
  });
};

const renderProfile = (user, profileData) => {
  if (!profileEmail || !profileLocation || !profileStatus) return;
  if (!user) {
    profileEmail.textContent = '로그인 필요';
    profileLocation.textContent = '-';
    profileStatus.textContent = '로그인 후 위치를 관리할 수 있습니다.';
    return;
  }
  profileEmail.textContent = user.email || '익명';
  profileLocation.textContent = profileData?.location || '저장된 위치 없음';
  profileStatus.textContent = '위치 수정 시 지도도 갱신됩니다.';
};

const updateAuthUI = user => {
  if (!authStatus) return;
  if (user) {
    authStatus.textContent = `${user.email || '익명'}로 로그인됨`;
    if (trailForm) trailForm.style.opacity = '1';
    if (authGate) authGate.style.display = 'none';
    document.body.classList.remove('locked');
  } else {
    authStatus.textContent = '로그인 후 코스를 업로드할 수 있습니다.';
    if (trailForm) trailForm.style.opacity = '0.6';
    if (authGate) authGate.style.display = 'flex';
    document.body.classList.add('locked');
  }
};

const handleLogin = async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  if (!email || !password) {
    authStatus.textContent = '이메일과 비밀번호를 입력해주세요.';
    return;
  }
  authStatus.textContent = '로그인 중…';
  try {
    await signInWithEmailAndPassword(auth, email, password);
    authStatus.textContent = '로그인 성공';
    await fetchTrails();
  } catch (err) {
    console.error(err);
    authStatus.textContent = '로그인 실패: 계정을 확인해주세요.';
  }
};

const handleSignup = async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  const locationText = authLocation.value.trim();
  if (!email || !password) {
    authStatus.textContent = '이메일과 비밀번호를 입력해주세요.';
    return;
  }
  if (!locationText) {
    authStatus.textContent = '자주 걷는 동네를 입력해주세요.';
    return;
  }
  authStatus.textContent = '회원가입 중…';
  try {
    const coords = await geocodeLocation(locationText);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await saveProfile(cred.user, locationText, coords);
    if (window.loadParksAtLocation) {
      window.loadParksAtLocation(coords.lat, coords.lon);
    }
    authStatus.textContent = '회원가입 및 로그인 완료';
    renderProfile(cred.user, { location: locationText, coords });
    await fetchTrails();
  } catch (err) {
    console.error(err);
    authStatus.textContent = '회원가입 실패: 비밀번호 정책이나 이메일 중복을 확인해주세요.';
  }
};

const handleLogout = async () => {
  authStatus.textContent = '로그아웃 중…';
  await signOut(auth);
  trailsGrid.innerHTML = '';
  trailsHint.textContent = '로그인 후 코스를 업로드할 수 있습니다.';
  renderProfile(null, null);
};

const handleProfileUpdate = async e => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) {
    profileStatus.textContent = '로그인 후 위치를 수정할 수 있습니다.';
    return;
  }

  if (!profileLocationInput) {
    profileStatus.textContent = '위치 입력 요소를 찾을 수 없습니다.';
    return;
  }

  const newLocation = profileLocationInput.value.trim();
  if (!newLocation) {
    profileStatus.textContent = '새 위치를 입력해주세요.';
    return;
  }

  profileStatus.textContent = '위치 업데이트 중…';
  try {
    const coords = await geocodeLocation(newLocation);
    await saveProfile(user, newLocation, coords);
    renderProfile(user, { location: newLocation, coords });
    if (window.loadParksAtLocation) {
      window.loadParksAtLocation(coords.lat, coords.lon);
    }
    profileStatus.textContent = '위치가 저장되고 지도가 갱신되었습니다.';
  } catch (err) {
    console.error(err);
    profileStatus.textContent = '위치를 업데이트하지 못했습니다. 장소명을 다시 확인해주세요.';
  }
};

if (trailForm) {
  trailForm.addEventListener('submit', handleSubmit);
}

if (trailsGrid) {
  trailsGrid.addEventListener('click', async e => {
    const btn = e.target.closest('.trail-delete');
    if (!btn) return;
    const user = auth.currentUser;
    if (!user) {
      trailsHint.textContent = '로그인 후 삭제할 수 있습니다.';
      return;
    }
    const trailId = btn.dataset.id;
    const ownerUid = btn.dataset.owner;
    if (ownerUid !== user.uid) {
      trailsHint.textContent = '자신이 올린 코스만 삭제할 수 있습니다.';
      return;
    }

    trailsHint.textContent = '삭제 중입니다…';
    try {
      const ref = doc(db, 'userTrails', trailId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        trailsHint.textContent = '이미 삭제된 코스입니다.';
        await fetchTrails();
        return;
      }
      if (snap.data().ownerUid !== user.uid) {
        trailsHint.textContent = '자신이 올린 코스만 삭제할 수 있습니다.';
        return;
      }
      await deleteDoc(ref);
      trailsHint.textContent = '삭제했습니다. 목록을 새로고침합니다.';
      await fetchTrails();
    } catch (err) {
      console.error(err);
      trailsHint.textContent = '삭제에 실패했습니다. 잠시 후 다시 시도해주세요.';
    }
  });
}

if (authLoginBtn) authLoginBtn.addEventListener('click', handleLogin);
if (authSignupBtn) authSignupBtn.addEventListener('click', handleSignup);
if (authLogoutBtn) authLogoutBtn.addEventListener('click', handleLogout);
if (profileForm) profileForm.addEventListener('submit', handleProfileUpdate);
if (profileLogoutBtn) profileLogoutBtn.addEventListener('click', handleLogout);

onAuthStateChanged(auth, user => {
  updateAuthUI(user);
  if (user) {
    fetchTrails();
    // 프로필 위치로 공원 불러오기
    getDoc(doc(profilesCol, user.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        renderProfile(user, data);
        if (data?.coords?.lat && data?.coords?.lon && window.loadParksAtLocation) {
          window.loadParksAtLocation(data.coords.lat, data.coords.lon);
        }
      } else {
        renderProfile(user, null);
      }
    }).catch(err => console.error(err));
  } else {
    renderProfile(null, null);
    trailsGrid.innerHTML = '';
    trailsHint.textContent = '로그인 후 코스를 업로드할 수 있습니다.';
  }
});
