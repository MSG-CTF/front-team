# 동아리 축제장 화면

## 화면 흐름

보드 → 동아리 축제장 → 동아리 부스 → 시그니처 문제 상세

- 첫 화면의 문제 카드 여섯 개를 없애고 축제장 천막 여섯 개로 변경
- 천막 전체를 클릭하거나 키보드로 선택하면 해당 동아리 부스로 이동
- 동아리에 문제가 여러 개 있어도 하나의 부스 안에서 표시
- 공개된 문제가 없는 동아리는 입장 불가
- 추가 동아리는 별도 입구로 표시하며 응답을 임의로 누락하지 않음
- MJSEC, SWING, Y-CERT, seKUrity, CodeCure, Aegis 순서와 기존 대학명 사용
- 정답 제출과 팀 점수 처리 계약은 변경하지 않음

## 모서리 수정

문제 목록, 문제 상세, 마이페이지에서 테두리 이미지 뒤까지 밝은 사각 배경이 채워지던 부분 수정
배경은 테두리 안쪽에만 칠하고 원본 이미지의 잘린 모서리는 투명하게 유지

## 그림

내장 이미지 생성 도구 사용
기존 보드의 가을 축제장 그림은 분위기 참고용으로 전달
새 원화는 1536 × 1024이며 배포용 WebP는 567762바이트

- 배포용 이미지: public/assets/signatures/club-festival-v1.webp
- 이미지 생성 이후 내용이나 구도는 바꾸지 않고 WebP 형식으로만 압축
- 간판의 동아리 이름은 HTML로 표시하고, 완료 스탬프의 로고는 기존 SVG 사용
- 모바일은 같은 그림의 부스별 영역을 사용해 2열로 배치
- 원본은 작업 폴더 output/frontend-api-20260920/club-festival-v1-original.png에 보관

## 확인

- 전체 작업과 PR 61 병합 내용을 합친 뒤 자동 테스트 144개 통과
- 여섯 동아리 부스와 문제 상세 왕복 이동
- 1440, 1280, 390, 360px에서 가로 넘침과 클릭 영역 겹침 없음
- 빈 공개 목록일 때 여섯 부스 모두 비활성화
- 존재하지 않는 동아리 주소에서 다른 동아리 문제를 대신 표시하지 않음
- 프론트 화면 이동 중 런타임 오류 없음

API 조회와 이동은 격리된 로컬 백엔드로 확인
빈 목록은 브라우저 응답을 바꿔 확인한 화면 예외 처리 시험

## 이름 간판과 완료 스탬프

- 간판은 MJSEC, SWING, Y-CERT, seKUrity, CodeCure, Aegis 이름만 표시
- MJSEC의 J가 간판 밖으로 나오지 않도록 글꼴과 줄 높이를 유지
- 해당 부스의 공개 문제를 모두 풀면 정면 가운데에 큰 흰색 원형 도장 표시
- 모든 도장은 이중 원 테두리이며 안쪽에는 해당 동아리의 로고만 사용
- 종이 받침, 색상 배지, CLEAR 문구는 사용하지 않음
- 로고는 원본 SVG를 알파 마스크로 사용해 비율을 유지하고 흰 잉크로 표현
- 원형, 세로형, 가로형 로고에 따라 도장 안쪽 여백을 조절하고 자르거나 늘리지 않음
- 원본 로고 파일은 그대로 보존하고 바깥 여백만 보정한 fitted SVG 사용
- 일부 문제만 풀었으면 해결 수만 표시하고 스탬프는 찍지 않음
- 실제 서버 응답의 문제별 is_solved 값으로 완료 여부를 결정
- 문제 상세의 밝은 종이 위에서는 같은 원형 도장을 진한 잉크로 표시
- 도장 등장 효과는 모션 줄이기 설정에서 중지

320, 360, 390, 768, 900, 901, 1280, 1440, 1920px에서 이름이 간판 안에 들어오는지, 도장이 가로 중앙에 놓이는지, 도장과 간판·대학명·입장 문구가 겹치는지 검사함
작은 PC 화면은 도장 크기와 높이를 따로 조정해 아래 안내 문구를 가리지 않게 함
실제 로컬 백엔드의 해결한 동아리 4곳과 화면의 완료 스탬프 4개를 대조함
여섯 동아리 전체 완료, 미해결, 일부 해결은 브라우저 응답만 바꾸는 화면 시험으로 구분함
키보드로 부스에 들어간 뒤 해결한 문제 상세에서도 해당 동아리의 스탬프를 확인함

2026-09-20 19:24 KST에 main 9098ef7을 반영한 상태로 위 9개 화면 너비, 완료 상태, 키보드 이동과 모션 줄이기 검사를 다시 통과함

## 생성 프롬프트

Use case: stylized-concept
Asset type: finished interactive game environment background for the MSG CTF club festival selection screen, landscape 3:2
Input image 1 is a STYLE AND WORLD reference only. Make a new location in that same warm illustrated autumn game world, not a UI screenshot.
Primary request: an inviting university club festival in an autumn forest by a lake at sunset. Exactly SIX distinct wooden festival booths arranged in a clean 3-column, 2-row layout, all facing the viewer with a gentle elevated perspective, clearly separated by wide cobbled paths. Warm lanterns, restrained bunting, amber maple foliage frame the outer edges. Rich hand-painted storybook game art, crisp wooden details, fabric awnings, soft golden lighting, no plastic 3D rendering.
Composition: the SIX booth centers are approximately at x=18%, 50%, 82% and y=42%, 77% of the full canvas. All booths equal visual importance, same architectural proportions. The top 18% is a quiet dark leafy canopy / distant sky area for an HTML page title and navigation. Each booth occupies around 23% of canvas width and 27% height, no overlap. Clearly visible striped awnings: muted brick red, forest green, ochre in first row; muted indigo, plum, teal in second row. Each booth has a plain dark wooden horizontal signboard below its awning which stays empty for an HTML club name overlay. A modest stall counter with books, small puzzle objects and lanterns below. Keep each front facade uncluttered and readable, make the tent shape and counters prominent. Small distant castle and lake in the upper background connect to the reference.
Constraints: Full-bleed opaque scenery all the way into all four corners, no white margin, no vignette to white, no cards, no borders, no interface chrome, absolutely NO text, letters, digits, logos, badges, labels, signs with writing or watermarks, no people or animals. This is a painted game environment, not a diagram. Exactly six booths, no additional stalls in background. The six clickable regions need clear silhouettes and space between them.
