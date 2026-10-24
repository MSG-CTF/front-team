# 🍁 MSG CTF — Frontend

가을 축제 콘셉트의 CTF(Capture The Flag) 대회 **MSG CTF**의 프론트엔드 저장소입니다.
팀이 주사위를 굴려 보드 위를 이동하고, 칸마다 열리는 문제를 풀며, 동아리 부스와 KoTH(King of the Hill) 문제까지 함께 즐기는 웹 서비스입니다.

> API 명세·기획 문서 전체는 [`AGENT.md`](AGENT.md)에 있습니다. 이 README는 화면별 기능을 설명하는 상세 안내서입니다.

---

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
1. [프로젝트 소개](#프로젝트-소개)
2. [개발 과정](#개발-과정)
3. [기능 상세](#기능-상세)
4. [시스템 아키텍처](#시스템-아키텍처)
5. [ERD](#erd)
6. [화면 구성](#화면-구성)
7. [폴더 구조](#폴더-구조)
8. [실행 방법](#실행-방법)

---

<a id="프로젝트-소개"></a>
## 🎯 프로젝트 소개

MSG CTF는 2026년 11월 8일 서울 종로 교원챌린지홀에서 열리는 연합 동아리 CTF 대회의 운영 플랫폼입니다. 참가비는 무료이고 접수는 HSPACE에서 받습니다. 참가자는 팀 단위로 로그인하며, 회원가입 화면은 없고 운영자가 미리 등록한 계정을 나눠 줍니다. 팀은 모두의마블처럼 36칸 보드판 위에서 주사위를 굴려 말을 움직이고, 도착한 칸에서 고른 문제를 15분 안에 풀면 점수와 마일리지, 추가 주사위를 받습니다. 보드 밖에서는 동아리 여섯 곳의 부스에서 시그니처 문제를 풀고, 15분 단위로 점수가 쌓이는 KoTH(King of the Hill) 문제에 도전하며, 모은 마일리지는 QR 결제로 부스에서 사용합니다.

이 저장소는 그중 **참가자와 운영자가 보는 웹 프론트엔드**입니다. React 단일 페이지 앱이고, 같은 `/api` 경로 아래의 백엔드와 통신합니다. 백엔드가 없는 환경에서도 화면을 확인할 수 있도록 Django로 만든 목 서버(`mock-backend/`)를 함께 두었습니다. API 계약과 기획 변경 이력은 [`AGENT.md`](AGENT.md)에, 기능별 검증 기록은 [`docs/`](docs)에 있습니다.

---

<a id="개발-과정"></a>
## 📆 개발 과정

PR 기록(#1~#164)을 기준으로 정리했습니다.

- 2026.08.19: 저장소 시작, KoTH와 규칙 페이지 UI 1차 구현
- 2026.08.26~29: 스코어보드, 마이페이지, 목 백엔드 추가 및 Figma 디자인 작업 시작
- 2026.08.29~09.07: Figma 시안을 보드, 문제 상세, 관리자 화면 6종의 React 코드로 변환
- 2026.08.30~09.13: 로그인, 보드, 문제 상세, 리더보드, KoTH, 타이머, 마이페이지 실제 API 연동과 CI 구축
- 2026.09.14~20: 열린 문제 목록, 찬스카드, 마일리지 QR, 홍보·참가 안내 페이지, 개발 서버 자동 배포
- 2026.09.28: 관리자 API 연동 확대, 기차여행·룰렛·열린 문제 패널 시안 반영, 보드판 주사위 3D 모션 구현
- 2026.09.29~30: 물리 엔진 기반 주사위 굴림, 기차 이동 모션과 경적·증기 효과, 문제 카드 선택 연출
- 2026.10.01~05: 라인 독점 표시, 보드 렌더링 부하 개선, 링크 공유 미리보기, 무인도 칸을 룰렛 칸으로 교체
- 2026.10.06~16: 문제 상세·마이페이지 Figma 재적용, 동아리 축제장과 부스 메뉴판 모달, 황금열쇠 카드 디자인
- 2026.10.08~21: 관리자 문제 배포 설정 구축 (GitHub 발행본 가져오기, 환경변수, 배포 테스트, 실행 설정)
- 2026.10.12~21: 서버 로그인 검증 라우트, 보안 헤더, 모바일 배치와 초기 로딩 성능 개선
- 2026.10.22~23: 관리자 콘솔 개편(노드·문제 배치), KoTH 관리 화면, 부스 플래그 제출 추가
- 2026.10.23~: 보드판 말 점핑 모션, 좌상단 패널 통합 등 마무리와 QA

---

<a id="기능-상세"></a>
## ⚙️ 기능 상세

홍보 페이지, 참가 안내, 로그인만 로그인 없이 열 수 있고, 나머지 게임·관리자 화면은 서버의 로그인 확인이 성공한 뒤에만 열립니다. 관리자 권한은 서버가 내려 준 `role`로만 판단합니다.

### ⭐️ 홍보 · 참가 안내 (`/`, `/guide`)
- 대회 일시·장소, 시작까지 남은 시간, 개요, 상금(총 200만원), 동아리 부스, 마일리지 상점, 행사장 지도, 신청 방법 소개
- `/guide`: 현장 참가 안내만 따로 모은 페이지
- 링크 공유 시 대회 이름과 이미지가 미리보기로 표시

### ⭐️ 로그인
- 아이디·비밀번호 로그인 (회원가입 없음, 관리자가 계정을 미리 등록)
- 액세스 토큰(1시간) 만료 시 자동 갱신, 로그아웃
- 관리자는 `/admin`, 참가자는 `/board`로 이동
- 대회 시작 전에는 보드·문제·KoTH·스코어보드 대신 카운트다운을 보여 주고 시작 시각에 자동으로 열림

### ⭐️ 보드 (`/board`)
- 36칸 원형 보드 (출발·문제·찬스·기차·룰렛), 칸 정보창, 방문한 칸 어둡게 표시
- 주사위: 팀 공용 최대 3회, 15분마다 충전, 문제를 연 뒤 15분 안에 풀면 +1회 (팀장만 굴리기·이동 확정)
- 3D 주사위 물리 모션, 말 점핑 이동, 새로고침·다른 브라우저에서도 미확인 굴림 복구
- 문제 칸 도착 시 같은 난이도 후보 최대 3개 중 1개 선택, 열면 15분 타이머 시작
- 출발 칸 100 마일리지·주사위 +1, 룰렛 칸 50~200 마일리지
- 찬스 칸 황금열쇠 카드 5종 (다시 굴리기, 두 번 굴려 고르기, 주변 이동, 세계여행, 주사위 보너스)
- 기차 칸 팀당 1회 원하는 칸으로 이동 (기차 모션, 경적 소리)
- 열린 문제 패널, 라인 독점 레일, KoTH 배너, 동아리 부스·스코어보드·마이페이지 이동 버튼

### ⭐️ 열린 문제 · 문제 상세 (`/challenges`, `/challenges/:id`)
- 열린 문제 검색, 분야·풀이 상태 필터, 내 인스턴스 바로가기
- 문제 설명, 분야, 난이도, 현재 배점(다이나믹 스코어링), 첨부파일 다운로드
- 인스턴스 생성·초기화·연장·종료, 상태와 남은 시간 실시간 표시 (정적 문제는 숨김)
- 플래그 제출, 정답 시 점수·마일리지·추가 주사위 안내, 3회 연속 오답 시 30초 잠금

### ⭐️ 동아리 부스 (`/signatures`)
- 축제장 그림에서 동아리 6곳(MJSEC, SWING, Y-CERT, seKUrity, CodeCure, Aegis) 부스 선택
- 부스 메뉴판 모달 (동아리 소개, 시그니처 문제 설명, 마일리지 메뉴) 후 플래그 제출
- 시그니처 점수는 대회 점수에 합산, 푼 문제는 풀이 완료로 표시

### ⭐️ KoTH (`/koth`)
- 동아리별 문제 6개, 공개 예정·진행 중·종료 상태와 현재 1위 팀 표시
- 팀 토큰 확인, 진행 중인 문제의 접속·참가자 파일 받기
- 15분 구간 순위로 점수 환산 (1~5위 40·25·15·12·8점), 문제별 순위표

### ⭐️ 스코어보드 · 마이페이지 · 기타
- 스코어보드(`/leaderboard`): 상위 8팀 점수 그래프, 전체 팀 랭킹 표, 30초마다 갱신
- 마이페이지(`/mypage`): 팀 정보·점수·순위, 마일리지 내역, 풀이 기록, 부스 결제용 QR(5분 유효)
- 타이머(`/timer`): 서버 시각 기준 남은 시간 / 규칙(`/rules`): 칸별 룰북

### ⭐️ 관리자 (`/admin/*`)
- 운영 대시보드: 대회 남은 시간, 인스턴스·팀·결제 현황, 최근 운영 기록
- 팀 관리: 검색·정렬, 밴/해제, 팀 수정·삭제, 말 위치·칸 상태·주사위 수정, 스냅샷 롤백
- 문제 관리: 공개 전환, 문제 생성, 풀이·제출 기록, GitHub 발행본 가져오기, 배포 버전과 환경변수, 배포 테스트, 참가자 화면 미리보기
- 시그니처 관리, KoTH 관리 (문제 등록, 15분 구간 기록 재수집, 연결 확인, 참가자 파일)
- 마일리지·결제: 내역 필터, 부스 QR 스캔 결제, 환불
- 노드·문제 배치: 노드 자원, 팀별 인스턴스, 계정별 예상 요금, 강제 재시작·종료
- 대회 설정(시각, 주사위, 오답 제한), 이벤트 로그, 계정 등록

---

<a id="시스템-아키텍처"></a>
## 🛠️ 시스템 아키텍처

브라우저는 NGINX가 서빙하는 React 정적 파일을 받고, `/api`와 상태 확인 경로는 NGINX가 백엔드로 넘겨 줍니다. 백엔드는 팀·보드·풀이·마일리지 데이터를 저장하고, 문제 인스턴스는 스케줄러와 브로커를 거쳐 실행 노드에 띄웁니다. KoTH는 동아리별 문제 서버가 15분마다 순위를 알려 주며 팀 토큰도 백엔드에 확인합니다. 문제 원본은 GitHub 저장소에서 가져옵니다. 프론트는 GitHub Actions가 테스트와 보안 검사를 거친 뒤 이미지를 만들어 개발 서버에 배포합니다.

<img src="docs/readme/architecture.png" alt="시스템 아키텍처" width="100%">

---

<a id="erd"></a>
## 📝 ERD

계정·팀, 보드, 문제·풀이, 인스턴스·배포, 마일리지·결제, KoTH·시그니처, 대회 운영의 일곱 묶음으로 나눠 색을 달리했습니다. 프론트 저장소에는 실제 DB 스키마가 없어서 `AGENT.md`의 API 명세와 `mock-backend/api/models.py`를 근거로 정리한 논리 ERD이며, 컬럼 이름은 실제 백엔드와 다를 수 있습니다. 이미지는 `python scripts/render-erd.py`로 다시 만들 수 있습니다.

<img src="docs/readme/erd.png" alt="ERD" width="100%">

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

| **대회 시작 전 대기** | **관리자 대시보드** |
|---|---|
| <img src="docs/images/admin/contest-gate.jpg" width="400"> | <img src="docs/images/admin/dashboard.jpg" width="400"> |

| **관리자 노드 · 문제 배치** | **관리자 문제 배포 버전** |
|---|---|
| <img src="docs/images/admin/node-detail.jpg" width="400"> | <img src="docs/images/admin/deploy-versions.jpg" width="400"> |

| **관리자 KoTH** | |
|---|---|
| <img src="docs/images/admin/koth-ticks.jpg" width="400"> | |

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

<a id="실행-방법"></a>
## 🚀 실행 방법

```bash
# 프론트엔드
npm ci
npm run dev        # http://localhost:5173
npm test           # 단위 테스트
npm run build      # dist/ 정적 파일 생성
```

백엔드가 없을 때는 목 서버를 같이 띄웁니다. 개발 서버가 `/api`를 `http://127.0.0.1:8000`으로 전달합니다.

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
