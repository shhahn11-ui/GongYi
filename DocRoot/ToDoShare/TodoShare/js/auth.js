import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// 회원가입 함수
export async function signUp(email, password, nickname) {
  try {
    // 등록
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 프로필에 닉네임 저장
    await updateProfile(user, {
      displayName: nickname
    });

    // Firestore에 사용자 정보 저장
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      nickname: nickname,
      createdAt: new Date().toISOString(),
      profileImage: '',
      bio: ''
    });

    return user;
  } catch (error) {
    console.error('회원가입 오류:', error.message);
    throw error;
  }
}

// 로그인 함수
export async function login(email, password) {
  try {
    // 로컬 스토리지 저장 활성화
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('로그인 오류:', error.message);
    throw error;
  }
}

// 로그아웃 함수
export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('로그아웃 오류:', error.message);
    throw error;
  }
}

// 현재 로그인 상태 확인
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// 사용자 정보 가져오기
export async function getUserInfo(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error.message);
    throw error;
  }
}

// 닉네임 업데이트
export async function updateNickname(uid, newNickname) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      nickname: newNickname
    });
    await updateProfile(auth.currentUser, {
      displayName: newNickname
    });
  } catch (error) {
    console.error('닉네임 업데이트 오류:', error.message);
    throw error;
  }
}

// 현재 로그인한 사용자 가져오기
export function getCurrentUser() {
  return auth.currentUser;
}
