# 🍁 MSG CTF — Frontend

가을 축제 콘셉트의 CTF 대회 **MSG CTF**의 프론트엔드 저장소입니다. 팀이 주사위를 굴려 36칸 보드를 돌며 문제를 풀고, 동아리 부스와 KoTH 문제까지 즐기는 웹 서비스입니다. 이 문서는 설치 방법, 기술 스택, 개발 기간, 시스템 아키텍처, ERD, 구현된 기능, 화면 구성을 설명합니다.

> API 명세·기획 문서 전체는 [`AGENT.md`](AGENT.md)에 있습니다.

## Technology Stack

**Language**

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![Python](https://img.shields.io/badge/Python_(Mock_API)-3776AB?style=flat-square&logo=python&logoColor=white)

**Frontend**

![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router_7-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js_Test_Runner-339933?style=flat-square&logo=nodedotjs&logoColor=white)

**Mock Backend / Infra**

![Django](https://img.shields.io/badge/Django_REST-092E20?style=flat-square&logo=django&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![NGINX](https://img.shields.io/badge/NGINX-009639?style=flat-square&logo=nginx&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)

**Design**

![Figma](https://img.shields.io/badge/Figma-F24E1E?style=flat-square&logo=figma&logoColor=white)

---

## 목차
1. [설치 및 실행](#설치-및-실행)
2. [개발 기간](#개발-기간)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [ERD](#erd)
5. [구현된 기능](#구현된-기능)
6. [화면 구성](#화면-구성)
7. [폴더 구조](#폴더-구조)

---

<a id="설치-및-실행"></a>
## 📌 설치 및 실행

```bash
# 1. 저장소 복제
git clone https://github.com/MSG-CTF/front-team.git
cd front-team

# 2. 프론트엔드 실행 (http://localhost:5173)
npm ci
npm run dev

# 3. 테스트 · 빌드
npm test
npm run build
```

백엔드가 없으면 목 서버를 함께 띄웁니다. 개발 서버가 `/api`를 `http://127.0.0.1:8000`으로 전달합니다.

```bash
cd mock-backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate && python manage.py seed_demo_data
python manage.py runserver 127.0.0.1:8000
```

| 계정 | 비밀번호 | 비고 |
|---|---|---|
| `member1` | `password1` | Alpha팀 팀원 |
| `leader1` | `password1` | Alpha팀 팀장 |
| `admin1` | `admin1234` | 관리자 |

Docker로는 `docker compose up --build` 한 번이면 프론트(3000번)와 목 서버(8000번)가 함께 뜹니다.

---

<a id="개발-기간"></a>
## 📆 개발 기간

PR 기록(#1~#164) 기준입니다.

- 2026.08.19 ~ 08.29 : 프로젝트 시작, KoTH·규칙·스코어보드·마이페이지 UI, Figma 디자인
- 2026.08.29 ~ 09.07 : 디자인 시안 완성, 보드·문제 상세·관리자 화면을 React로 변환
- 2026.08.30 ~ 09.13 : 로그인, 보드, 문제 상세, 리더보드, KoTH, 타이머 실제 API 연동, CI 구축
- 2026.09.14 ~ 09.20 : 열린 문제 목록, 찬스카드, 마일리지 QR, 홍보·참가 안내 페이지, 자동 배포
- 2026.09.28 ~ 09.30 : 관리자 API 확대, 보드 주사위 3D 모션, 기차 이동 모션
- 2026.10.01 ~ 10.16 : 라인 독점, 렌더링 성능, 동아리 부스, 황금열쇠 카드, Figma 재적용
- 2026.10.08 ~ 10.23 : 관리자 문제 배포 설정, 노드 배치, KoTH 관리 화면
- 2026.10.23 ~ : 말 점핑 모션, 패널 통합, 모바일 대응과 QA

---

<a id="시스템-아키텍처"></a>
## 🛠️ 시스템 아키텍처

<img src="docs/readme/architecture.png" alt="시스템 아키텍처" width="100%">

---

<a id="erd"></a>
## 📝 ERD

API 명세와 목 서버 모델을 기준으로 정리한 논리 ERD입니다. 실제 DB 컬럼과 다를 수 있습니다.

<img src="docs/readme/erd.png" alt="ERD" width="100%">

---

<a id="구현된-기능"></a>
## ⚙️ 구현된 기능

### ⭐️ AUTH · 홍보
- 아이디/비밀번호 로그인, 토큰 자동 갱신, 로그아웃 (회원가입 없음, 관리자가 계정 등록)
- 홍보·참가 안내 페이지, 링크 공유 미리보기
- 대회 시작 전 카운트다운 대기 화면

### ⭐️ BOARD
- 36칸 보드, 3D 주사위, 말 점핑 이동, 칸 정보창
- 주사위 팀 공용 최대 3회, 15분 충전
- 문제 후보 3개 중 선택 (15분 타이머), 열린 문제 패널
- 찬스 칸 카드 5종, 룰렛 칸, 기차 칸, 출발 칸 보상, 라인 독점 표시

### ⭐️ CHALLENGE
- 열린 문제 검색·필터, 문제 상세, 첨부파일 다운로드
- 인스턴스 생성·초기화·연장·종료
- 플래그 제출 (다이나믹 스코어링, 3회 오답 시 30초 잠금)

### ⭐️ 동아리 부스 · KOTH
- 동아리 6곳 축제장, 부스 메뉴판, 시그니처 문제 제출
- KoTH 6문제, 팀 토큰, 15분 구간 점수, 문제별 순위표

### ⭐️ SCOREBOARD · MYPAGE
- 상위 8팀 점수 그래프, 전체 팀 랭킹
- 팀 정보, 마일리지 내역, 풀이 기록, 결제 QR
- 타이머, 규칙

### ⭐️ ADMIN
- 운영 대시보드, 팀 관리(밴·위치·주사위·롤백), 계정 등록
- 문제 관리(GitHub 가져오기, 배포 버전, 배포 테스트), 시그니처, KoTH 관리
- 마일리지·QR 결제, 노드·문제 배치, 대회 설정, 이벤트 로그

---

<a id="화면-구성"></a>
## 🖼️ 화면 구성

| **보드** | **열린 문제 목록** |
|---|---|
| <img src="docs/readme/board.jpg" width="400"> | <img src="docs/readme/open-challenges.jpg" width="400"> |

| **문제 상세** | **동아리 축제장** |
|---|---|
| <img src="docs/readme/challenge-detail.jpg" width="400"> | <img src="docs/readme/festival.jpg" width="400"> |

| **부스 메뉴판** | **KoTH** |
|---|---|
| <img src="docs/images/game/booth-menus.jpg" width="400"> | <img src="docs/readme/koth.jpg" width="400"> |

| **마이페이지** | **규칙** |
|---|---|
| <img src="docs/readme/mypage.jpg" width="400"> | <img src="docs/readme/rules.jpg" width="400"> |

| **관리자 대시보드** | **관리자 노드 · 문제 배치** |
|---|---|
| <img src="docs/images/admin/dashboard.jpg" width="400"> | <img src="docs/images/admin/node-detail.jpg" width="400"> |

| **관리자 문제 배포 버전** | **관리자 KoTH** |
|---|---|
| <img src="docs/images/admin/deploy-versions.jpg" width="400"> | <img src="docs/images/admin/koth-ticks.jpg" width="400"> |

---

<a id="폴더-구조"></a>
## 📁 폴더 구조

```text
.
├── src/
│   ├── api/            # axios 클라이언트와 API별 요청 함수
│   ├── features/       # 화면 단위 기능 (admin, auth, board, challenges, intro,
│   │                   #   koth, leaderboard, mypage, rules, signatures, timer)
│   ├── components/     # 공통 컴포넌트
│   ├── routes/         # 라우트 정의와 접근 제어
│   ├── utils/          # 시간·응답·폴링 유틸
│   └── styles/         # 공통 스타일
├── public/assets/      # 화면별 이미지·폰트
├── mock-backend/       # 로컬 연동 테스트용 Django 목 서버
├── build/              # 빌드 플러그인(공유 미리보기 메타)과 테스트
├── scripts/            # 이미지 최적화·QA 보조 스크립트
├── docs/               # 기능별 문서와 화면 검증 자료
├── archive/            # 초기 기획 문서 보관
├── AGENT.md            # 통합 기획·API 명세서
├── Dockerfile · docker-compose.yml · nginx.conf.template
└── .github/workflows/  # CI (테스트 · 보안 스캔 · 이미지 빌드)
```

---
