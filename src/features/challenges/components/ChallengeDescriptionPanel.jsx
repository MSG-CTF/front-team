// Figma node 104:462 그룹 (panel-description) — 배경판(panel-description.png)에
// 이미 "DESCRIPTION"/"ATTACHMENTS" 라벨과, 각 첨부파일 줄 오른쪽의 "MB" 단위
// 라벨까지 그려져 있다. 그래서 여기서는 실제 설명 텍스트 / 체크박스 아이콘 /
// 파일명 / 용량 숫자만 정확한 좌표(캔버스 1920x1080 기준 %)로 겹쳐 그린다.
// "MB"를 다시 붙이면 배경에 이미 있는 "MB"와 겹쳐서 이중으로 보이니 주의.
//
// 좌표는 Figma의 버튼1(top 827px)/버튼2(top 904px) 두 행을 기준으로 하고,
// 세 번째 행부터는 그 간격(77px)을 그대로 반복한다.
const CANVAS = { w: 1920, h: 1080 };
const ROW_BASE = { checkboxTop: 827, filenameTop: 833, sizeTop: 830 };
const ROW_STEP = 904 - 827; // 77px

const CHECKBOX_LEFT = 188;
const CHECKBOX_SIZE = { w: 49, h: 43 };
const FILENAME_LEFT = 243;
const SIZE_LEFT = 999;

const pctX = (px) => `${(px / CANVAS.w) * 100}%`;
const pctY = (px) => `${(px / CANVAS.h) * 100}%`;

export default function ChallengeDescriptionPanel({ description, attachments }) {
  return (
    <>
      <div className="absolute left-[6.77%] top-[33.43%] w-[52.08%] h-[58.33%]" aria-hidden="true">
        <img
          src="/assets/challenge-detail/panel-description.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      </div>

      {/* 실제 문제 설명 — Figma 시안에는 빈 줄무늬만 있고 텍스트 레이어가 없어
          같은 영역(줄무늬가 그려진 자리)에 겹쳐서 배치했다. */}
      <p className="absolute left-[8.85%] top-[40.74%] w-[45.83%] h-[27.78%] overflow-y-auto whitespace-pre-line font-im-fell text-[1.15cqw] text-auth-text">
        {description}
      </p>

      {attachments.map((attachment, index) => {
        const top = {
          checkbox: ROW_BASE.checkboxTop + index * ROW_STEP,
          filename: ROW_BASE.filenameTop + index * ROW_STEP,
          size: ROW_BASE.sizeTop + index * ROW_STEP,
        };
        return (
          <div key={attachment.name}>
            <img
              src="/assets/challenge-detail/icon-checkbox.png"
              alt=""
              aria-hidden="true"
              className="absolute pointer-events-none object-contain"
              style={{
                left: pctX(CHECKBOX_LEFT),
                top: pctY(top.checkbox),
                width: pctX(CHECKBOX_SIZE.w),
                height: pctY(CHECKBOX_SIZE.h),
              }}
            />
            <a
              href={attachment.url ?? undefined}
              download
              className="absolute whitespace-nowrap font-kode-mono text-[1.25cqw] text-auth-text no-underline"
              style={{ left: pctX(FILENAME_LEFT), top: pctY(top.filename) }}
            >
              {attachment.name}
            </a>
            <span
              className="absolute whitespace-nowrap font-kode-mono text-[1.25cqw] text-detail-size"
              style={{ left: pctX(SIZE_LEFT), top: pctY(top.size) }}
            >
              {attachment.sizeLabel}
            </span>
          </div>
        );
      })}
    </>
  );
}
