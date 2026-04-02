# TRD: 기술 요구사항 정의서

> **문서 버전**: 1.0
> **작성일**: 2026-04-02
> **프로젝트**: 외국어 교재 MP3 자동 배달 서비스

---

## 1. 시스템 아키텍처

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  사용자 UI  │────▶│  Express.js  │────▶│  Resend API │
│ (HTML/CSS/JS)│    │   Server     │     │ (이메일발송) │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │  JSON File   │
                    │  Database    │
                    │ (data/db.json)│
                    └──────────────┘
```

### 요청 흐름
1. 사용자 → Express 정적 파일 서빙 (public/)
2. 검색/필터 → GET /api/textbooks → JSON DB 조회
3. MP3 발송 → POST /api/send → Rate Limit 검사 → Resend API 호출 → 이력 기록
4. 관리자 → 세션 인증 → CRUD API → JSON DB + 파일시스템

---

## 2. 기술 스택

| 구분 | 기술 | 버전 | 선정 이유 |
|------|------|------|----------|
| **런타임** | Node.js | 18+ | 빠른 프로토타이핑, 비동기 I/O |
| **프레임워크** | Express.js | 4.18.2 | 경량 HTTP 서버, 미들웨어 생태계 |
| **데이터베이스** | JSON File | - | 별도 DB 설치 불필요, 소규모 운영 적합 |
| **이메일** | Resend API | 3.2.0 | 간편한 API, 무료 플랜 제공 |
| **파일 업로드** | Multer | 2.0.0 | Express용 multipart/form-data 처리 |
| **세션** | express-session | 1.17.3 | 서버 사이드 세션 관리 |
| **환경변수** | dotenv | 16.4.5 | .env 파일 기반 설정 관리 |
| **프론트엔드** | Vanilla HTML/CSS/JS | - | 빌드 도구 불필요, v0.dev/shadcn-ui 스타일 |

---

## 3. 데이터 모델 상세

### 3.1 저장소: `data/db.json`

```json
{
  "textbooks": [],
  "history": [],
  "_nextId": {
    "textbooks": 1,
    "history": 1
  }
}
```

- 서버 시작 시 `initDB()`로 자동 생성
- `_nextId`로 auto-increment 구현
- 읽기/쓰기 시 전체 파일 파싱/직렬화

### 3.2 교재 스키마

```javascript
{
  id: Number,              // PK (auto-increment)
  title: String,           // 교재명 (필수)
  language: String,        // "japanese" | "chinese" (필수)
  level: String | null,    // 레벨 (N5, HSK 1급 등)
  publisher: String | null,// 출판사
  description: String | null, // 설명
  mp3_filename: String | null, // 저장 파일명 (예: "1712023400000-abc123.mp3")
  mp3_size: Number,        // 파일 크기 (bytes)
  created_at: String,      // "YYYY-MM-DD HH:MM:SS"
  updated_at: String       // "YYYY-MM-DD HH:MM:SS"
}
```

### 3.3 발송 이력 스키마

```javascript
{
  id: Number,              // PK (auto-increment)
  textbook_id: Number,     // FK → textbooks.id
  textbook_title: String,  // 비정규화 (교재 삭제 후에도 이력 유지)
  email: String,           // 수신자 이메일
  status: String,          // "success" | "failed"
  error_msg: String | null,// 실패 시 오류 메시지
  sent_at: String          // "YYYY-MM-DD HH:MM:SS"
}
```

---

## 4. API 엔드포인트 상세

### 4.1 교재 검색

```
GET /api/textbooks?q={keyword}&language={filter}
```

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| q | string | N | 검색 키워드 (2자 미만 시 무시) |
| language | string | N | `japanese`, `chinese`, `all` |

**응답**: `200 OK`
```json
[
  {
    "id": 1,
    "title": "JLPT N5 완전정복",
    "language": "japanese",
    "level": "N5",
    "publisher": "다락원",
    "description": "...",
    "mp3_filename": "1712023400000-abc.mp3",
    "mp3_size": 1024
  }
]
```

**정렬**: 언어 → 제목 (오름차순)

---

### 4.2 MP3 이메일 발송

```
POST /api/send
Content-Type: application/json
```

**요청 본문**:
```json
{
  "textbookId": 1,
  "email": "user@example.com"
}
```

**응답**:

| 상태코드 | 조건 | 응답 |
|----------|------|------|
| 200 | 발송 성공 | `{ "success": true, "message": "..." }` |
| 400 | 필수값 누락, 이메일 형식 오류, MP3 없음 | `{ "error": "..." }` |
| 404 | 교재 미존재 | `{ "error": "..." }` |
| 429 | Rate Limit 초과 | `{ "error": "..." }` |
| 500 | 발송 실패 | `{ "error": "..." }` |

---

### 4.3 관리자 인증

```
POST /api/admin/login
Content-Type: application/json

{ "username": "admin", "password": "admin123" }
```

| 상태코드 | 조건 | 응답 |
|----------|------|------|
| 200 | 로그인 성공 | `{ "success": true }` (세션 쿠키 설정) |
| 401 | 인증 실패 | `{ "error": "..." }` |

```
POST /api/admin/logout   → { "success": true }
GET  /api/admin/me        → { "isAdmin": true/false }
```

---

### 4.4 관리자 CRUD

**교재 등록** (multipart/form-data):
```
POST /api/admin/textbooks

Fields: title, language, level, publisher, description
File: mp3 (audio/mpeg, max 100MB)
```

**교재 수정**:
```
PUT /api/admin/textbooks/:id
(동일 form-data, 파일 미첨부 시 기존 유지)
```

**교재 삭제**:
```
DELETE /api/admin/textbooks/:id
(MP3 파일도 함께 삭제)
```

**통계 조회**:
```
GET /api/admin/stats
→ { "totalBooks": 10, "totalSends": 5, "todaySends": 2 }
```

**이력 조회**:
```
GET /api/admin/history?limit=200
→ [ { id, textbook_id, textbook_title, email, status, error_msg, sent_at } ]
```

---

## 5. 보안 설계

### 5.1 인증

| 항목 | 구현 |
|------|------|
| 방식 | express-session (서버 사이드 세션) |
| 저장 | 메모리 스토어 (기본) |
| 만료 | 1시간 (cookie.maxAge: 3600000ms) |
| 보호 | `requireAuth()` 미들웨어로 관리자 API 보호 |

### 5.2 Rate Limiting

```
대상: POST /api/send
제한: IP당 15분에 5회
저장: In-memory Map
초과 시: 429 Too Many Requests
```

### 5.3 입력 검증

| 검증 대상 | 방법 |
|-----------|------|
| 이메일 형식 | 정규식 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| MP3 파일 | Multer fileFilter (MIME: audio/mpeg 또는 .mp3 확장자) |
| 파일 크기 | Multer limits: 100MB |
| 필수 필드 | 서버 측 null/빈값 검사 |

### 5.4 민감 정보 관리

- `.env` 파일로 분리 (API 키, 비밀번호, 세션 시크릿)
- `.gitignore`에 `.env` 포함
- `.env.example`로 템플릿 제공

---

## 6. 파일 관리

### 6.1 업로드 흐름

```
사용자 파일 선택
  → Multer가 메모리에 버퍼로 수신
  → 파일명 생성: {timestamp}-{random6자리}.mp3
  → data/mp3/ 디렉토리에 저장
  → DB에 파일명/크기 기록
```

### 6.2 파일 서빙

```
Express static: /mp3 → data/mp3/
(직접 접근 가능: http://localhost:3001/mp3/{filename})
```

### 6.3 파일 삭제

- 교재 수정 시 새 파일 업로드 → 기존 파일 삭제
- 교재 삭제 시 → MP3 파일 함께 삭제
- `fs.unlinkSync()` 사용, 파일 미존재 시 무시

---

## 7. 이메일 발송 흐름

```
POST /api/send 요청
  → Rate Limit 검사
  → 교재 조회 (DB)
  → MP3 파일 읽기 (fs.readFileSync)
  → Resend API 호출
      from: FROM_EMAIL (.env)
      to: [사용자 입력 이메일]
      subject: "📚 교재 MP3 도착: {교재명}"
      html: 스타일링된 HTML 템플릿
      attachments: [{filename: "{교재명}.mp3", content: Buffer}]
  → 성공 시: history에 "success" 기록
  → 실패 시: history에 "failed" + error_msg 기록
```

---

## 8. 디렉토리 구조

```
mp3-delivery/
├── server.js              # Express 서버 진입점
├── seed.js                # 샘플 데이터 생성 (10개 교재 + 더미 MP3)
├── package.json           # 의존성 관리
├── .env                   # 환경변수 (git 제외)
├── .env.example           # 환경변수 템플릿
├── .gitignore             # node_modules, .env, data/ 제외
│
├── src/
│   ├── db.js              # JSON 파일 DB (CRUD, 검색, 통계)
│   ├── mailer.js          # Resend API 이메일 발송
│   └── routes/
│       ├── textbooks.js   # GET /api/textbooks
│       ├── send.js        # POST /api/send (+ Rate Limiter)
│       └── admin.js       # 관리자 API 전체
│
├── public/
│   ├── index.html         # 사용자 메인 페이지
│   └── admin/
│       └── index.html     # 관리자 대시보드
│
└── data/                  # 런타임 생성 (git 제외)
    ├── db.json            # 데이터베이스
    └── mp3/               # MP3 파일 저장소
```

---

## 9. 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `3001` | 서버 포트 |
| `RESEND_API_KEY` | (필수) | Resend API 인증 키 |
| `FROM_EMAIL` | `onboarding@resend.dev` | 발신자 이메일 |
| `ADMIN_USER` | `admin` | 관리자 아이디 |
| `ADMIN_PASSWORD` | `admin123` | 관리자 비밀번호 |
| `SESSION_SECRET` | `mp3delivery-secret` | 세션 암호화 키 |

---

## 10. 배포 및 운영

### 10.1 로컬 실행

```bash
git clone https://github.com/kwkang-openbus/mp3-delivery.git
cd mp3-delivery
npm install
cp .env.example .env        # API 키 등 수정
npm run seed                 # 샘플 데이터 생성
npm start                    # http://localhost:3001
```

### 10.2 운영 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm start` | 서버 실행 |
| `npm run dev` | 파일 변경 감지 모드 (--watch) |
| `npm run seed` | 샘플 교재 10개 + 더미 MP3 생성 |

### 10.3 외부 접속 (ngrok)

```bash
ngrok http 3001
# → https://xxxx.ngrok-free.app 으로 외부 접속 가능
```

### 10.4 알려진 제한사항

| 항목 | 내용 |
|------|------|
| Rate Limiting | 단일 프로세스 메모리 기반 (분산 환경 미지원) |
| 동시성 | JSON 파일 DB 특성상 동시 쓰기 시 데이터 손실 가능 |
| 이메일 제한 | Resend 무료: 계정 소유자 이메일만 수신 가능 |
| 세션 저장소 | 메모리 기반 (서버 재시작 시 세션 초기화) |
| 페이지네이션 | 미구현 (교재/이력 전량 로드) |
