# 리더보드 그림 구성

leaderboard.png는 기존 원본이며 수정하지 않음

leaderboard-clean.png는 배경의 고정 숫자와 순위 장식, 범례만 지운 바탕 이미지
원본의 제목, 표, 풍경, 종이 질감은 그대로 유지하도록 이미지 편집 도구로 생성

leaderboard-layout.png는 위 바탕에서 하단 표의 내부 선만 추가로 지운 현재 사용 이미지
CLUB 열을 추가하면서 이미지에 박힌 표와 실제 칸이 어긋나지 않도록 표 선은 HTML table에서 그리도록 분리
바깥 프레임, 풍경과 종이 질감은 유지하고 원본 파일은 보존

편집 방식은 내장 imagegen이며 별도 CLI나 API 키는 사용하지 않음
최종 저장 위치는 public/assets/leaderboard/leaderboard-layout.png

1·2·3등 월계관과 낙엽은 새로 그리지 않고 LeaderboardArtworkSymbol에서 원본 영역을 표시
SVG viewBox로 해당 영역을 분리하고 종이색만 투명하게 처리
실제 순위가 바뀌거나 두 번째 페이지로 이동하면 해당 순위에 맞는 장식만 표시

그래프 축과 점수선은 API 데이터로 렌더링하며 고정 시간이나 가짜 점수를 배경에 넣지 않음

## 배경 편집 프롬프트

Use case: precise-object-edit. Asset type: existing web game's scoreboard background, exact restoration not a redesign. Image 1 is the edit target. Make ONLY the following removals with seamless matching parchment inpainting: (1) remove the numeric vertical graph scale 0 1500 3000 4500 6000 7500, and the bottom time labels 09:00 through 21:00, but KEEP the thin axis strokes, tick marks and entire grid in EXACTLY the same positions; (2) remove all six small colored maple leaves in the legend area on the right of the upper graph; (3) remove the numbers and wreaths for ranks 1,2,3,4,5,6 in the leftmost column of the lower table, keeping all table lines. Everything else MUST stay identical: same 1672:941 landscape aspect ratio, composition, full frame edges, warm parchment texture and colors, autumn leaves, mountain/lake, lantern, books, title SCOREBOARD, leaf icon and text POINTS, footer MSG CTF. Do not add any elements, borders, data, labels, UI, badges or new decoration. No flat-color patches, gradients, rectangles or blurred edges where objects were removed; continue the existing paper grain naturally. Preserve sharpness and the exact positioning of the two large panels and all grid lines. Return the edited full background only, highest available resolution.

## 하단 내부 표 선 분리 프롬프트

Use case: precise-object-edit. Image 1 is the edit target, an existing scoreboard web-game background. Make ONE exact restoration edit only: remove ALL of the internal table grid lines in the LOWER parchment panel (approximately x177 to1498, y563 to827), including the horizontal header separator and all very faint vertical and horizontal cell separators. Seamlessly continue the existing warm parchment texture in those cleared areas. Keep the outer ornamental border of this lower panel exactly unchanged. Keep absolutely EVERYTHING outside these lower interior grid strokes unchanged, especially the entire upper graph with its axes/grid/ticks, SCOREBOARD heading, POINTS label, MSG CTF footer, maple leaves, lake/landscape, lantern and books. Do not change overall color, grain, composition, crop, dimensions or aspect ratio. Preserve the exact 1672 by 941 full-frame composition. No new text, data, buttons, symbols, decoration or flat-color covering rectangle. The lower panel must become naturally blank parchment inside the original frame, not a redesign.
