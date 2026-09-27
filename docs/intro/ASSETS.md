# 이미지와 글꼴

기존 배경과 MSG 로고, Pretendard 파일은 기존 public/assets 경로 사용
신규 파일은 public/assets/intro 아래에 보관

## 이미지

| 파일 | 출처와 처리 |
| --- | --- |
| mascot-dice-*-v2.png | 기존 다람쥐를 참조한 승인 시안 3장, 얼굴과 받침 통일 |
| preparation-*.png | 준비물과 본인 확인 안내용 시안, 실제 개인정보 없음 |
| msg-ctf-2025-poster.png | 운영진이 전달한 2025년 원본 포스터, 원본 비율 유지 |
| club-*.svg | HSPACE 클럽 목록의 원본 로고 |
| hspace-logo.svg | HSPACE 공식 CI |
| monster-energy-logo.png | 전달받은 브랜드 가이드 내장 로고 |
| siya-insight-logo.svg | 전달받은 시야인사이트 가로형 AI의 원본 벡터 변환 |

주최 동아리는 MJSEC, SWING, Y-CERT, seKUrity, CodeCure, Aegis
학교 이름은 동아리 소속을 뜻하며 대학 본부의 공식 주최로 표기하지 않음
동아리와 후원사 로고에 색상 필터, 자르기, 비율 변형을 적용하지 않음
MONSTER ENERGY는 M 심볼과 문자를 분리하지 않고 공개 전 담당자 확인 필요
시야인사이트는 어두운 배경에서도 보이도록 흰 여백을 둔 원본 벡터 사용

- [HSPACE 클럽 목록](https://hspace.io/club/list)
- [HSPACE 디자인 안내](https://hspace.io/design/ci)
- [HSPACE 후원 기준](https://hspace.io/club/sponsorship)
- [2025년 현장 기록](https://www.instagram.com/p/DQ7MN8Hk5Qx/?img_index=3)

## 글꼴

인트로 전용 font-family 이름으로 선언해 게임 화면의 글꼴과 충돌하지 않게 분리
세 글꼴 모두 SIL Open Font License 1.1

| 글꼴 | 파일과 라이선스 |
| --- | --- |
| Pretendard Variable | 기존 public/assets/fonts/pretendard 경로와 LICENSE 사용 |
| Song Myung | intro/fonts/SongMyung-Regular.ttf, SongMyung-OFL.txt |
| IM Fell English | intro/fonts/IMFeENrm28P.ttf, IMFellEnglish-OFL.txt |

- [Pretendard 제작자 저장소](https://github.com/orioncactus/pretendard)
- [Song Myung 원본](https://github.com/google/fonts/tree/main/ofl/songmyung)
- [IM Fell English 원본](https://github.com/google/fonts/tree/main/ofl/imfellenglish)

인트로는 위 로컬 글꼴을 사용
기존 게임 화면이 쓰는 index.html의 Google Fonts 연결은 변경하지 않음
