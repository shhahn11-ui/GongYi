# 📋 TodoShare - 투두 리스트 공유 앱

Firebase를 사용한 로그인 시스템과 투두 리스트 공유 기능이 있는 웹 애플리케이션입니다.

## 📁 프로젝트 구조

```
TodoShare/
├── index.html              # 로그인 페이지
├── signup.html             # 회원가입 페이지
├── dashboard.html          # 개인 투두 리스트 (보호됨)
├── shared-lists.html       # 공유된 리스트 (보호됨)
├── profile.html            # 사용자 프로필 (보호됨)
├── README.md               # 설명 문서
├── css/
│   └── styles.css          # 전체 스타일시트
└── js/
    ├── firebase-config.js  # Firebase 설정
    ├── auth.js            # 인증 관련 함수
    └── header.js          # 헤더 관리 함수
```

## 🚀 주요 기능

### 1. 인증 시스템
- ✅ 이메일과 비밀번호로 회원가입
- ✅ 닉네임 설정
- ✅ 로그인/로그아웃
- ✅ Firebase Authentication 사용
- ✅ 자동 세션 유지

### 2. 개인 투두 리스트 (대시보드)
- ✅ 할일 추가/삭제
- ✅ 완료 상태 토글 (체크박스)
- ✅ 카테고리 설정 (건강, 공부, 헬스, 일, 취미, 기타)
- ✅ 카테고리별 필터링
- ✅ 좋아요 기능 (개인 리스트용)

### 3. 리스트 공유
- ✅ 공유된 리스트 조회
- ✅ 다른 사용자의 리스트 열람
- ✅ 카테고리별 필터링
- ✅ 작성자 정보 표시
- ✅ 좋아요 기능 (공유 리스트용)
- ✅ 할일 상태 표시

### 4. 프로필 관리
- ✅ 닉네임 변경
- ✅ 자기소개 작성 및 수정
- ✅ 통계 보기
  - 총 할일 수
  - 완료한 할일 수
  - 공유한 할일 수
  - 총 좋아요 수
- ✅ 비밀번호 변경
- ✅ 계정 삭제 (되돌릴 수 없음)

## 🔐 보안 기능

- 로그인하지 않은 사용자는 대시보드, 공유 리스트, 프로필에 접근 불가
- 이미 로그인한 사용자는 로그인/회원가입 페이지에 자동 리디렉션
- 로컬 스토리지에 세션 저장 (새로고침 후에도 유지)
- 비밀번호는 Firebase에서 안전하게 암호화되어 저장됨

## 📱 반응형 디자인

- 데스크톱, 태블릿, 모바일에 최적화
- 터치 친화적 UI
- 모바일에서 모든 기능 정상 작동

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+ 모듈)
- **Backend**: Firebase
  - Authentication: Firebase Auth (이메일/비밀번호)
  - Database: Firestore
  - Storage: Firebase Storage (향후 프로필 사진 업로드용)
- **Module System**: ES6 모듈 시스템

## 📝 사용 방법

### 1. 회원가입
1. 회원가입 페이지로 이동
2. 닉네임, 이메일, 비밀번호 입력
3. 비밀번호 확인 입력
4. 회원가입 버튼 클릭

### 2. 로그인
1. 로그인 페이지에서 이메일과 비밀번호 입력
2. 로그인 버튼 클릭
3. 대시보드로 자동 이동

### 3. 할일 추가 (개인 리스트)
1. 대시보드에서 할일 입력
2. 카테고리 선택 (필수)
3. 추가 버튼 클릭 또는 Enter 키

### 4. 할일 관리
- **완료 표시**: 체크박스 클릭
- **좋아요**: 💚 버튼으로 좋아요 증가
- **삭제**: 삭제 버튼으로 할일 제거
- **필터링**: 카테고리 버튼으로 필터링

### 5. 공유된 리스트 보기
1. "리스트 공유" 메뉴 클릭
2. 다른 사용자가 공유한 리스트 조회
3. 좋아요 추가 가능
4. 카테고리별로 필터링

### 6. 프로필 관리
1. "내 프로필" 메뉴 클릭
2. 닉네임, 자기소개 수정
3. 통계 확인
4. 비밀번호 변경 또는 계정 삭제

## 🔄 데이터 구조

### Firestore - users 컬렉션
```json
{
  "uid": "사용자 고유 ID",
  "email": "user@example.com",
  "nickname": "사용자 닉네임",
  "bio": "자기소개",
  "profileImage": "프로필 이미지 URL",
  "createdAt": "2026-02-22T..."
}
```

### Firestore - todos 컬렉션
```json
{
  "uid": "작성자 UID",
  "text": "할일 내용",
  "category": "건강|공부|헬스|일|취미|기타",
  "completed": false,
  "shared": false,
  "likes": 0,
  "nickname": "작성자 닉네임",
  "createdAt": "Timestamp"
}
```

### Firestore - mail 컬렉션 (로그인/로그아웃 알림 큐)
```json
{
  "to": ["user@example.com"],
  "message": {
    "subject": "[TodoShare] 로그인 알림",
    "text": "TodoShare 계정에서 로그인이 감지되었습니다.",
    "html": "<p>TodoShare 계정에서 <strong>로그인</strong>이 감지되었습니다.</p>"
  },
  "metadata": {
    "eventType": "login|logout",
    "uid": "사용자 UID",
    "email": "user@example.com",
    "nickname": "닉네임"
  },
  "createdAt": "Timestamp"
}
```

## 📧 Firebase 로그인/로그아웃 메일 설정

1. Firebase Console → Extensions → `Trigger Email` 설치
2. 메일 전송 제공자(SMTP 또는 SendGrid) 정보 입력
3. 확장 감시 컬렉션을 `mail`로 설정
4. 로그인/로그아웃 시 `mail` 컬렉션 문서 생성 확인

예시 Firestore 규칙(로그인 사용자 본인 이메일로만 큐 등록 허용):

```javascript
match /mail/{docId} {
  allow create: if request.auth != null
    && request.resource.data.to is list
    && request.resource.data.to.size() == 1
    && request.resource.data.to[0] == request.auth.token.email;
  allow read, update, delete: if false;
}
```

## 🎨 커스터마이징

### 카테고리 추가
1. [dashboard.html](dashboard.html) 에서 `<select id="categorySelect">` 내 옵션 추가
2. [shared-lists.html](shared-lists.html) 에서 카테고리 버튼 추가

### 색상 변경
[css/styles.css](css/styles.css) 에서 색상 코드 수정:
- 주색상: `#007bff` (파란색)
- 성공: `#28a745` (초록색)
- 경고: `#ffc107` (노란색)
- 위험: `#dc3545` (빨강색)

## 🔧 API 참고

### auth.js 내 사용 가능한 함수
```javascript
signUp(email, password, nickname)    // 회원가입
login(email, password)                // 로그인
logout()                              // 로그아웃
getCurrentUser()                      // 현재 사용자 정보
getUserInfo(uid)                      // 사용자 정보 조회
updateNickname(uid, newNickname)     // 닉네임 업데이트
onAuthChange(callback)                // 인증 상태 변화 감지
```

## 📍 로컬 테스트

개인 컴퓨터의 localhost에서 테스트:
```
http://localhost/TodoShare/
또는
http://127.0.0.1/TodoShare/
```

## 🌐 배포

Apache 웹서버에 배포하려면:
1. TodoShare 폴더를 `htdocs` (또는 웹루트) 에 복사
2. Apache 서버 재시작
3. 도메인 또는 IP 주소로 접속

## 🐛 트러블슈팅

### Firebase 연결 안 됨
- 브라우저 콘솔 (F12) 에서 오류 메시지 확인
- Firebase API 키 정상 여부 확인
- 인터넷 연결 확인

### 로그인 실패
- 이메일 정확성 확인
- 비밀번호 정확성 확인
- Firebase Console에서 사용자 생성 여부 확인

### 로그인/로그아웃 메일이 오지 않음
- Firebase Extensions에서 `Trigger Email` 확장을 설치했는지 확인
- 확장 기본 컬렉션을 `mail`로 설정했는지 확인
- SMTP/메일 전송 제공자 설정이 정상인지 확인
- Firestore에 `mail` 문서가 생성되는지 확인 (로그인/로그아웃 시)
- 브라우저 콘솔(F12)에서 `인증 메일 큐 등록 오류` 경고 확인

### 데이터 저장 안 됨
- Firestore 규칙 확인 (테스트 모드 또는 공개 모드)
- 네트워크 연결 확인

## 📞 지원

문제 발생 시 브라우저 개발자 도구 (F12) 의 콘솔 창에서 오류 메시지를 확인하세요.

---

**생성일**: 2026년 2월 22일  
**버전**: 1.0  
**상태**: 개발 완료
