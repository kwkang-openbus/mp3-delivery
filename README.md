# 📚 MP3 배달 서비스

외국어 교재 MP3 음원을 이메일로 자동 배달하는 웹 서비스입니다.

> **Bus-Ton 해커톤** (AI Vibe Coding) 출품작

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| **교재 검색** | 제목·출판사 키워드 검색 + 언어별 필터 (일본어/중국어) |
| **MP3 이메일 발송** | 교재 선택 → 이메일 입력 → 원클릭 발송 |
| **관리자 대시보드** | 교재 CRUD, 발송 이력 조회, 통계 확인 |
| **보안** | IP 기반 Rate Limiting (15분당 5회), 세션 인증 |

## 🛠 기술 스택

- **Backend**: Node.js + Express
- **Database**: JSON 파일 기반 (별도 DB 불필요)
- **Email**: Resend API
- **Frontend**: Vanilla HTML/CSS/JS (v0.dev/shadcn-ui 스타일)
- **File Upload**: Multer

## 🚀 빠른 시작

### 1. 클론 & 설치

```bash
git clone https://github.com/kwkang-openbus/mp3-delivery.git
cd mp3-delivery
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 값을 수정하세요:

```
PORT=3001
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx   # Resend에서 발급받은 API 키
FROM_EMAIL=onboarding@resend.dev              # 발신 이메일
ADMIN_USER=admin                              # 관리자 아이디
ADMIN_PASSWORD=admin123                       # 관리자 비밀번호
SESSION_SECRET=change-me-in-production        # 세션 시크릿
```

> **Resend API 키 발급**: [resend.com](https://resend.com) 가입 → API Keys → Create API Key

### 3. 샘플 데이터 생성

```bash
npm run seed
```

10개의 샘플 교재와 더미 MP3 파일이 생성됩니다.

### 4. 서버 실행

```bash
npm start
```

- 🌐 사용자 페이지: http://localhost:3001
- 🔧 관리자 페이지: http://localhost:3001/admin

## 📁 프로젝트 구조

```
mp3-delivery/
├── server.js            # Express 서버 진입점
├── seed.js              # 샘플 데이터 생성 스크립트
├── package.json
├── .env.example         # 환경변수 템플릿
├── src/
│   ├── db.js            # JSON 파일 기반 DB (CRUD)
│   ├── mailer.js        # Resend API 이메일 발송
│   └── routes/
│       ├── textbooks.js # GET /api/textbooks (검색/필터)
│       ├── send.js      # POST /api/send (MP3 발송 + Rate Limit)
│       └── admin.js     # 관리자 API (인증/CRUD/이력/통계)
├── public/
│   ├── index.html       # 사용자 메인 페이지
│   └── admin/
│       └── index.html   # 관리자 대시보드
└── data/                # (런타임 생성) DB + MP3 파일
    ├── db.json
    └── mp3/
```

## 📌 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/textbooks?q=&language=` | 교재 검색 |
| POST | `/api/send` | MP3 이메일 발송 |
| POST | `/api/admin/login` | 관리자 로그인 |
| GET | `/api/admin/stats` | 대시보드 통계 |
| GET | `/api/admin/textbooks` | 교재 전체 목록 |
| POST | `/api/admin/textbooks` | 교재 등록 (multipart) |
| PUT | `/api/admin/textbooks/:id` | 교재 수정 |
| DELETE | `/api/admin/textbooks/:id` | 교재 삭제 |
| GET | `/api/admin/history` | 발송 이력 |

## ⚠️ 참고사항

- **Resend 무료 플랜**: 계정 소유자 이메일로만 발송 가능. 도메인 인증 시 제한 해제.
- **data 폴더**: `.gitignore`에 포함. 최초 실행 시 `npm run seed`로 생성하세요.
- **Rate Limiting**: IP당 15분에 5회로 제한됩니다.

## 📄 라이선스

MIT
