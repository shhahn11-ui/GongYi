// Firebase 설정
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCdK3oJh24C5fKF_QUefKBhn86a2c8AIqE",
  authDomain: "todolist-c5cd4.firebaseapp.com",
  projectId: "todolist-c5cd4",
  storageBucket: "todolist-c5cd4.appspot.com",
  messagingSenderId: "692855328036",
  appId: "1:692855328036:web:baa0c1b8f48b5ab794f7b1",
  measurementId: "G-PGKNWGBST8"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

enableIndexedDbPersistence(db).catch((error) => {
  console.warn('Firestore 오프라인 캐시 활성화 실패:', error.code || error.message);
});

export { app, auth, db, storage };
