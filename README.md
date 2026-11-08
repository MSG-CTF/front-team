# MSG CTF Frontend

주사위를 굴려 보드를 돌며 문제를 푸는 MSG CTF의 참가자·관리자 화면입니다
문제 풀이와 인스턴스 접속부터 KOTH, 동아리 부스, 마일리지 결제까지 한 화면 흐름으로 연결합니다

[플랫폼 전체 소개](https://github.com/MSG-CTF/msg-ctf.github.io)

## 맡은 일

- 보드·3D 주사위·말 이동·찬스카드와 남은 시간 표시
- 문제 선택·지문·파일 다운로드·플래그 제출·인스턴스 제어
- KOTH 접속·문제별 토큰·점수 수집 상태와 순위 표시
- 팀 정보·마일리지·QR, 동아리 부스와 시그니처 문제
- 관리자 문제 가져오기·배포 버전·테스트·감사 로그·상품 결제
- 새로고침·두 브라우저 재시도·응답 유실 후 화면 복구와 모바일 대응

## 함께 만든 사람들

| 기여자 | 기여 내용 | 관련 PR |
| --- | --- | --- |
| [tortoiese](https://github.com/tortoiese) | 문제·보드·관리자 UI, API 연결, 타이머와 화면 디자인 | [#8](https://github.com/MSG-CTF/front-team/pull/8) · [#26](https://github.com/MSG-CTF/front-team/pull/26) · [#288](https://github.com/MSG-CTF/front-team/pull/288) |
| [yes0r](https://github.com/yes0r) | 보드·KOTH·순위·마이페이지, 동아리 부스와 3D 화면 구성 | [#1](https://github.com/MSG-CTF/front-team/pull/1) · [#14](https://github.com/MSG-CTF/front-team/pull/14) · [#247](https://github.com/MSG-CTF/front-team/pull/247) |
| [Giheon-Jeon](https://github.com/Giheon-Jeon) | 프론트 CI, Nginx API 프록시와 의존성 보안 검사 | [#17](https://github.com/MSG-CTF/front-team/pull/17) · [#35](https://github.com/MSG-CTF/front-team/pull/35) · [#36](https://github.com/MSG-CTF/front-team/pull/36) |
| [woalseee](https://github.com/woalseee) | 프론트 실행 환경과 개발 VM 자동 배포 | [#39](https://github.com/MSG-CTF/front-team/pull/39) · [#44](https://github.com/MSG-CTF/front-team/pull/44) · [#85](https://github.com/MSG-CTF/front-team/pull/85) |
| [goldsimchoi](https://github.com/goldsimchoi) | TCP·TLS·SNI 접속 안내와 관리자 이미지 준비 화면 | [#201](https://github.com/MSG-CTF/front-team/pull/201) · [#235](https://github.com/MSG-CTF/front-team/pull/235) · [#245](https://github.com/MSG-CTF/front-team/pull/245) |
| [dnehdx](https://github.com/dnehdx) | 팀 정보·분야별 순위 표시와 CSP 적용 | [#172](https://github.com/MSG-CTF/front-team/pull/172) · [#199](https://github.com/MSG-CTF/front-team/pull/199) · [#295](https://github.com/MSG-CTF/front-team/pull/295) |
| [jiwonnii](https://github.com/jiwonnii) | 주사위 연속 사용과 충전 규칙 안내 | [#54](https://github.com/MSG-CTF/front-team/pull/54) |
| [jongcoding](https://github.com/jongcoding) | 운영 QA와 연동 보완, 재시도 복구·다운로드·관리자 상품 결제 | [#150](https://github.com/MSG-CTF/front-team/pull/150) · [#294](https://github.com/MSG-CTF/front-team/pull/294) · [#296](https://github.com/MSG-CTF/front-team/pull/296) |

2026-11-09까지 병합된 PR과 커밋을 기준으로 정리했습니다

## 기술 구성

JavaScript · React · Vite · React Router · Tailwind CSS · Three.js

## 개발·운영 문서

- [관리자 화면](docs/admin-console.md)
- [배포 환경 설정](docs/deployment-broker.md)
- [인스턴스 오류 안내](docs/instance-reset-feedback.md)
- [화면·API 기획](AGENT.md)
- [기존 개발·설정 참고 문서](README.reference.md)
