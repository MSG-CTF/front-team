# 라인 완료 문장 이미지

작성: 2026-09-29

## 사용 파일

- 결과: public/assets/board/line-complete-crest-v1.png
- 참고 이미지: public/assets/board/board-grid.png
- 제작: 내장 imagegen 이미지 편집 도구
- 크기: 1774 × 887px, 2:1, RGBA PNG
- 배경: 투명, 모서리 알파 값 0 확인
- 원본 보드 이미지와 생성 원본은 그대로 보존

원래 START 칸의 왕관과 월계수 장식을 참고해 색감과 재질을 맞춤
보드에서는 220 × 110 원본 좌표 크기로 배치하며 화면 배율에 맞춰 함께 축소
글자는 이미지에 넣지 않고 별도 접근 가능한 UI로 표시

## 최종 프롬프트

```text
Use case: background-extraction / precise-object-edit. Input image 1 is the existing painted fantasy game board. Extract and refine ONLY the small gold crown and paired laurel branches from the lower START tile into one standalone game achievement crest. Preserve the board's original warm hand-painted 2.5D art direction, orange-burnished antique gold, softly bevelled metal and dark amber recesses. Crown with three prominent readable points, a small red-brown inset beneath it, two simple curved gold laurel branches, compact horizontal silhouette. It must look like it came from the same artist and material as the reference, not a modern vector icon or a shiny plastic mobile reward badge. Match warm upper-left light. Real material detail but broad shapes that still read clearly at 40-60px wide. Isolate one centered crest with genuinely transparent background. Crest should occupy about 85% of the canvas width, fully visible with a small transparent margin. Remove ALL surrounding tiles, START lettering, numerals, board, frame, scenery and background. No text, no ribbon, no surrounding circular disk, no large shield, no outer glow, no particles, no sparkles, no ground shadow, no watermark. Deliver the isolated transparent PNG sprite only, not a page or a mockup.
```

## 검사

- PNG 시그니처, 알파 채널 형식과 2:1 비율 자동 검사
- 실제 보드에서 데스크톱 및 390px 모바일 축소 상태 확인
- 전체 6개 완료 상태에서 이미지와 설명의 경계가 문제 칸과 주사위 클릭 영역을 가리지 않는지 확인
- 생성 이미지는 완료 장식에만 사용하고 문제 칸, 숫자와 원본 보드 그림은 교체하지 않음
