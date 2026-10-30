# 라인 독점 지급 정보 연결

Backend #182의 GET /api/v1/board/me 응답에 있는 line_monopolies를 사용한다
계약은 [Backend OpenAPI](https://github.com/MSG-CTF/msg-backend/blob/feature/board-me-line-monopolies/docs/board-line-monopolies.openapi.json)에 둔다

- line_number로 서버가 지정한 5개 문제 칸 라인에 연결한다
- 지급 기록과 해당 라인의 CLEARED 상태가 모두 있어야 완료 레일을 표시한다
- earned_score는 실제 저장된 지급액을 표시하며 기본 비율로 다시 계산하지 않는다
- 0점 지급은 완료로 표시한다
- is_category_bonus는 라인 모델의 isCategoryBonus로 보존한다
- 빈 지급 목록은 미지급으로, 구버전의 필드 누락과 잘못된 지급 정보는 미확인으로 유지한다
- 관리자 수정과 정답 회수 뒤 새 응답을 받으면 지급액·완료 레일을 갱신한다

보드 조회 응답만 lossless-json 4.3.3으로 읽고 일반 숫자는 기존 number로 유지한다
안전한 정수 범위를 넘는 JSON 정수는 LosslessNumber로 보존해 표시와 합계에서 자릿수를 잃지 않는다
공개 JSON 필드와 숫자 형식은 변경하지 않는다

검증은 지급 목록 없음·누락·잘못된 키·중복 라인·0점·소수·관리자 수정·정답 회수·큰 정수와 합계를 포함한다
별도 로컬 백엔드와 브라우저 연결 검증에서는 실제 관리자 및 제출 API를 사용한다
