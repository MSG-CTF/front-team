# 노드별 문제 예약 자원

2026-10-22 KST 확인 기준, 2026-10-23 용량과 계정 요금 요청 추가

- 프론트 PR 기준 main: 6db93b4 (#155) 및 관리자 화면 개편
- 백엔드 PR 기준 main: e74d021d38116df6f5d734338955c817ef956fa7
- 백엔드의 현재 GET /api/v1/admin/resources는 노드 전체 CPU·메모리 사용률과 container_count를 제공
- 이전 running_instances는 호환 표시만 유지하며 container_count와 같은 단위로 취급하지 않음
- 브로커 기반 커밋: staging 3f29019024d152fac71f3b1a0c57f8b8e1ade214
- 스케줄러 검증 커밋: dev 99947cd24ff8bb6051d9e50d4c3ee95510a5d466
- 브로커와 백엔드의 feat/admin-node-allocation-20261022 로컬 변경을 연결해 예약 원장 조회를 구현
- 배포 순서는 브로커 → 백엔드 → 프론트이며 운영 반영은 별도

## 추가 응답 계약

기존 응답의 accounts[].nodes[]에 선택 필드 resource_allocation을 추가
백엔드는 브로커 GET /v1/inventory/resource-targets?include_allocations=true 응답을 받고 문제·팀 이름을 일괄 조회해 보충
아래 값은 계약 예시이며 운영 배포 여부를 뜻하지 않음

같은 자리에 선택 필드 os, arch, disk_usage_percent 와 계정의 provider 를 추가 제안 (2026-10-23 갱신, 프론트 요청)
브로커가 VM 이미지와 노드 라벨(kubernetes.io/os, kubernetes.io/arch), 클라우드 계정 종류에서 채움
프론트는 값이 있을 때만 아이콘·배지·필터를 보이며 node_name 이나 계정 이름으로 추측하지 않음
값이 없거나 아래 목록 밖이면 아이콘 없이 표시하고 필터 항목에서도 빠짐

| 필드 | 보내는 값 | 함께 읽는 표기 |
| --- | --- | --- |
| accounts[].nodes[].os | LINUX, WINDOWS, MACOS | WIN, MAC, OSX, DARWIN |
| accounts[].nodes[].arch | X64, ARM64, X86, ARM | amd64, x86_64, aarch64, arm64v8, i386, i686, armv7l, armhf, linux/arm64 같은 플랫폼 표기, 필드 이름 architecture |
| accounts[].nodes[].disk_usage_percent | 0~100 숫자, 노드 루트 디스크 실사용률 | 없음 |
| accounts[].provider | AWS, GCP, AZURE, OCI, NCP, KT, NHN, ONPREM | EKS, GKE, AKS, ORACLE, NAVER, NCLOUD, TOAST, BAREMETAL 등 |

- 표기는 대소문자와 기호를 무시하고 읽음
- disk_usage_percent 가 85 이상이면 CPU·메모리와 같이 사용률 높음으로 묶음
- provider 가 목록 밖이면 보낸 이름 그대로 기타 묶음으로 표시
- 기존 응답에 이 필드가 없으면 디스크 막대는 수집 전(-)으로, 플랫폼·운영체제 필터는 숨김

```json
{
  "accounts": [
    {
      "account_id": "aws-prod",
      "provider": "AWS",
      "nodes": [
        { "node_name": "ip-10-0-1-23", "os": "LINUX", "arch": "arm64", "cpu_usage_percent": 41.5, "memory_usage_percent": 63.2, "disk_usage_percent": 72.0 }
      ]
    }
  ]
}
```

```json
{
  "resource_allocation": {
    "collected_at": "2026-10-22T00:00:00+09:00",
    "complete": true,
    "allocatable": { "cpu_millicores": 4000, "memory_mib": 8192 },
    "other_reserved": { "cpu_millicores": 500, "memory_mib": 1024 },
    "allocations": [
      {
        "reservation_id": "00000000-0000-4000-8000-000000000004",
        "reservation_status": "COMMITTED",
        "expires_at": null,
        "instance_id": "00000000-0000-4000-8000-000000000001",
        "challenge_id": "00000000-0000-4000-8000-000000000002",
        "challenge_title": "가을 축제 티켓 발매기",
        "team_id": "00000000-0000-4000-8000-000000000003",
        "team_name": "도토리묵사발",
        "status": "RUNNING",
        "resources": { "cpu_millicores": 500, "memory_mib": 512 }
      }
    ]
  }
}
```

## 노드 용량과 계정 요금 (2026-10-23 프론트 요청)

노드 상세는 용량, 실사용, 예약을 한 칸에 보이고 노드 화면은 계정별로 묶어 요금을 미리 본다
무료 크레딧 계정이 대회 중에 바닥나지 않게 새 배치를 멈추거나 다른 계정으로 돌리려는 용도

| 필드 | 값 | 화면 |
| --- | --- | --- |
| accounts[].nodes[].capacity | { cpu_millicores, memory_mib, disk_gib } 노드 전체 크기 | 노드 타일 용량 줄, 상세 용량 칸 cpu 와 memory 가 없으면 resource_allocation.allocatable 을 쓰고 디스크는 미수집 |
| accounts[].nodes[].instance_type | e2-standard-4, t4g.large 같은 클라우드 머신 종류 | 상세 머리 |
| accounts[].billing | { plan, currency, credit_total, spent, hourly_cost, observed_at } | 계정 카드 요금 칸 |
| accounts[].scheduling_enabled | true 면 새 인스턴스를 이 계정 노드에 놓는다 | 계정 카드 스위치 |

- plan 은 FREE_TRIAL(무료 크레딧), CREDIT(선불 크레딧), BUDGET(예산 한도) currency 는 USD 또는 KRW
- spent 는 지금까지 쓴 금액, hourly_cost 는 지금 노드 구성의 시간당 요금 브로커의 cost_estimate 나 클라우드 결제 API에서 채운다
- 화면은 예상 사용 = spent + hourly_cost × 대회 종료까지 남은 시간으로 계산하고, 크레딧을 넘으면 대회 전에 소진, 80% 이상이면 빠듯함으로 표시한다 대회 종료 시각은 GET /timer 의 end_time
- 대회 전에 바닥날 계정 카드가 맨 위에 온다
- billing 이 없으면 관리자가 입력한 값을 이 브라우저(localStorage msgctf.admin.billing.{account_id})에만 남기고 출처를 함께 보인다

### PATCH /admin/resources/accounts/{account_id}

```json
{
  "scheduling_enabled": false,
  "billing": { "plan": "FREE_TRIAL", "currency": "USD", "credit_total": 300, "spent": 241.6, "hourly_cost": 9.4 },
  "reason": "크레딧 소진 예상"
}
```

- 보낸 칸만 바꾸고 reason 은 1~500자 필수 운영 기록에 남긴다
- scheduling_enabled 를 false 로 바꾸면 브로커는 이 계정 노드에 새 인스턴스를 놓지 않는다 실행 중인 인스턴스는 만료될 때까지 그대로 둔다
- 응답: { account_id, billing, scheduling_enabled }
- 오류: 400 INVALID_REQUEST, 404 ACCOUNT_NOT_FOUND 엔드포인트가 없으면(404, 405, 501) 화면은 요금 계획을 이 브라우저에 저장하고 스위치는 반영 전 안내를 보인다

## 생산 측 조건

- allocatable은 호스트의 시스템 예약분을 제외한, 문제 인스턴스를 예약할 수 있는 총용량
- Agent가 전달한 node_allocatable 원본을 저장하며 실행 요청량·실사용량을 뺀 기존 allocatable_capacity는 분모로 사용하지 않음
- 브로커 20261022_0001 migration 후 첫 관측 전 총용량은 null로 표시하며 이전 가용량으로 추정하지 않음
- allocations는 같은 노드에서 아직 해제되지 않은 예약의 전체 목록이며 instance_id는 중복되지 않는 UUID 문자열
- 과거 예약의 인스턴스 식별자가 UUID가 아니면 instance_id는 null로 반환하며 reservation_id로 식별해 예약량을 보존
- resources는 각 인스턴스 생성 당시의 실제 예약값이며 현재 활성 릴리스의 설정을 곱해서 추정하지 않음
- COMMITTED는 런타임 사용량에 이미 관측돼도 계속 표시하며, HELD는 만료 전까지 표시
- STOPPING, FAILED, CLEANUP_PENDING 등의 이름만으로 예약을 제거하지 않으며 브로커의 반납·만료가 기준
- 스케줄링 후보의 remaining_capacity는 실사용량과 중복 차감을 피하는 값이므로 예약 총량 계산에 사용하지 않음
- CPU·메모리 총용량과 예약 전체 목록은 노드별로 같은 SQL 문장의 스냅샷에서 조회
- 계정 목록의 offset 페이지들은 서로 다른 수집 시각일 수 있으며 각 노드의 collected_at을 보존
- other_reserved는 allocations에 들어 있지 않은 예약을 나타내며 둘 사이 중복이 없어야 함
- complete는 페이지 누락과 수집 실패가 없고 총용량·예약값이 동일 시점의 일관된 스냅샷일 때만 true
- 이전 페이지, 현재 릴리스, 호스트 문자열 또는 이벤트 로그 메시지로 노드 배치를 추론하지 않음
- 수집되지 않은 값은 null이며 0은 실제로 수집한 0만 의미
- 완전한 빈 allocations는 해당 노드에 예약된 문제 인스턴스가 없다는 뜻
- 문제 카탈로그 등록 자체는 인스턴스 예약으로 세지 않음
- 응답은 관리자 인증을 유지하고 비밀값·플래그·접속 토큰을 포함하지 않음

## 화면 동작

- 관리자 첫 화면의 노드 위젯은 위급한 노드부터 여섯 줄을 이름과 CPU·메모리·디스크 막대로 보이고 나머지는 노드 화면으로 넘김 (위젯 안 스크롤 없음)
- 막대 색은 70% 아래 회색, 70%부터 노랑, 85%부터 빨강이며 값이 없으면 - 로 표시
- 첫 화면의 노드를 누르면 /admin/resources의 해당 노드 상세로 이동
- 어느 노드도 resource_allocation을 보내지 않으면 타일마다 미수집을 반복하지 않고 각주 한 줄로 안내
- /admin/resources는 계정별 전체 노드 격자로 시작하며 특정 노드를 자동 선택하지 않음
- 요약 화면의 특정 노드 링크는 node 쿼리로 해당 노드의 상세를 바로 열 수 있음
- /admin/logs는 이벤트 로그에 집중
- 노드 선택 → 상세 창의 문제별 CPU·메모리 예약 막대 → 문제 선택 → 팀별 인스턴스 목록
- 노드 이름·계정·플랫폼·운영체제·수집된 문제명으로 검색
- 상태 타일(전체·정상·확인 필요·사용률 높음·상태 미수집) 하나와 플랫폼·운영체제 필터 칩을 함께 걸 수 있으며 칩은 응답에 실제로 있는 값만 보임
- 운영체제 칩은 운영체제와 아키텍처를 한 이름으로 보임 (Linux x86_64, Windows x86_64, macOS arm64)
- 노드는 클라우드별로 묶어 한 격자 위에 나란히 두고, 묶음은 노드 수만큼 칸을 차지해 타일이 같은 세로선에 맞음 같은 클라우드의 계정 여럿은 한 묶음에 넣고 타일에 계정 이름을 붙임
- 클라우드 표시는 공식 로고(AWS, Google Cloud, Azure: SVG Logos CC0 / Oracle: 워드마크의 O / NCP: NAVER N, Simple Icons CC0)이고 KT, NHN, 자체 서버는 머리글자 타일
- 페이지당 개수 제한으로 노드를 숨기지 않으며, 목록 높이를 추정하는 가상 배치 없이 실제 카드 높이를 유지
- 검색 인덱스는 수집 응답이 바뀔 때만 만들고 상세 예약 집계는 선택한 노드에 대해서만 수행
- 자동 갱신에서 노드 카드에 보이는 값이 같으면 카드 렌더링을 건너뛰며 상세 예약은 최신 응답으로 갱신
- 동일 문제의 여러 인스턴스는 합산하고 같은 제목의 다른 문제는 UUID로 구분
- 막대의 번호와 문제 목록의 번호를 연결하며 수치와 비율을 함께 제공
- 누락 또는 부분 수집은 빗금으로 표시하고 남은 용량을 계산하지 않음
- 초과 예약은 수치를 숨기거나 100%로 고치지 않고 초과량과 총용량 경계선을 표시
- 기존 API에서는 노드 실사용률을 유지하고 문제별 배치 미수집 상태를 명시
- 노드 자료는 5초 간격의 HTTP 폴링으로 갱신하며 숨겨진 탭에서는 중단하고 복귀 시 바로 조회
- 갱신 중에도 검색·필터·상세 선택을 유지하고 실패 시 이전 자료와 갱신 지연 표시를 유지
- 상세를 닫으면 선택했던 노드로 키보드 초점이 돌아옴
- 관리자 배포 테스트도 실제 예약으로 포함하며 일반 참가자 팀과 구분해 표시

## 확인 범위

프론트 단위 테스트 및 예제 응답을 이용한 브라우저 QA는 연동 검증과 구분
실제 백엔드·브로커·스케줄러와 격리된 로컬 K3s의 QA 컨테이너를 연결해 검증
운영 데이터와 실제 휴대기기는 사용하지 않으며 모바일 Chrome·WebKit 엔진 검증을 별도로 기록
