# 리더보드 CLUB 점수 요청

## 전달할 내용

리더보드에 CLUB 칸은 붙여뒀는데 전체 순위 응답에 부스 점수가 따로 없어서 모든 팀의 값을 표시할 수 없는 상태예요

GET /api/v1/ranking 의 각 팀에 signature_score 내려주시면 됩니다
팀 정보 API에서도 쓰고 있는 이름이라 club_score로 새로 만들 필요는 없어요

- 값은 해당 팀의 SignatureSolve.earned_score 합계
- 부스를 풀지 않은 팀은 숫자 0
- 상위 8팀뿐 아니라 다음 페이지의 팀에도 포함
- 소수점 점수도 그대로 반환
- team_score에는 이미 부스 점수가 들어가 있으니 총점에 다시 더하지 않기

현재 내부 집계에서는 signature_score를 구하는데 최종 순위 응답을 만들 때 빠지고 있어요
집계한 값을 응답까지 넘기고 숫자 변환만 기존 점수와 맞춰주면 됩니다

응답의 팀 한 행 예시

```json
{
  "team_id": "existing-team-id",
  "team_name": "부스 참가팀",
  "rank": 1,
  "team_score": 825,
  "signature_score": 425,
  "mileage": 330,
  "last_solved_at": "2026-11-08T03:00:00Z"
}
```

위 예시에서 총점 825는 JEOPARDY 200 + KoTH 200 + CLUB 425
CLUB은 총점의 일부를 따로 보여주는 칸이고 마일리지와는 별개

## 프론트에 반영한 내용

- signature_score가 오면 그 값을 바로 표시
- 아직 없는 경우에는 상위 8팀 그래프의 SIGNATURE 기록을 합산
- 두 응답의 팀 총점이 같고 기록이 온전할 때만 임시 합산값을 사용
- 값이 없거나 조회 시점이 맞지 않으면 0으로 표시하지 않고 하이픈으로 표시
- 백엔드에서 필드를 추가하면 상위 8팀 밖에서도 별도 프론트 수정 없이 연결

## 같이 확인할 테스트

- 9위 이하 팀도 부스 점수가 내려오는지
- 기록이 없는 팀의 0점과 응답 필드 누락이 구분되는지
- 소수점 점수와 관리자 점수 변경이 반영되는지
- 페이지를 넘기거나 순위가 바뀌어도 팀별 점수가 맞는지
- signature_score 추가 전후 총점과 정렬 결과가 그대로인지

KoTH도 전체 순위에서 따로 표시하려면 koth_score가 필요해요
이 필드도 프론트에서 받을 준비는 해뒀고 현재는 그래프 기록으로 확인되는 팀만 표시해요
분류별 점수와 Solves는 전체 순위 응답 계약이 별도로 필요하며 이번 CLUB 필수 요청과는 구분

## 확인 근거

확인 기준은 2026-09-20 백엔드 main 997142a0b4b4343cff8454ed87a153b9bd04c0ec

- [부스 점수 내부 집계](https://github.com/MSG-CTF/msg-backend/blob/997142a0b4b4343cff8454ed87a153b9bd04c0ec/apps/ranking/views.py#L33)
- [최종 순위 응답에서 빠지는 부분](https://github.com/MSG-CTF/msg-backend/blob/997142a0b4b4343cff8454ed87a153b9bd04c0ec/apps/ranking/ranking.py#L30)
- [팀 정보 API의 signature_score](https://github.com/MSG-CTF/msg-backend/blob/997142a0b4b4343cff8454ed87a153b9bd04c0ec/apps/teams/views.py#L59)
- [시그니처 제출 명세](https://app.notion.com/p/3b00f19c72be807395ccdae44a0d211e)

백엔드와 노션은 수정하지 않았고 GitHub 댓글이나 이슈도 아직 게시하지 않음
