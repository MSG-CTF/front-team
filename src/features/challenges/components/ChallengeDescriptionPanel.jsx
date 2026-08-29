// Figma node 307:23 (panel-description, 1000x630) — 배경판에 "DESCRIPTION"/"ATTACHMENTS"
// 라벨과 각 첨부파일 줄 오른쪽 "MB" 단위 라벨이 이미 그려져 있다. 실제 설명 텍스트 /
// 체크박스 아이콘 / 파일명 / 용량 숫자만 캔버스 1920x1080 기준 % 좌표로 겹친다.
// ("MB"를 다시 붙이면 배경의 "MB"와 겹쳐 이중으로 보이니 주의.)
//
// 좌표는 Figma node 307:31/307:32(체크박스 top 637.39/714.39)를 기준으로 하고,
// 세 번째 행부터는 그 간격(77px)을 그대로 반복한다.
const CANVAS = { w: 1920, h: 1080 };
// ChallengeInfo 그룹 오프셋(left 119, top 140) + 그룹 내부 좌표.
const GROUP = { left: 119, top: 140 };
const ROW_BASE = { checkbox: 637.39, filename: 643.39, size: 640.39 };
const ROW_STEP = 714.39 - 637.39; // 77px

const CHECKBOX_LEFT = 58;
const CHECKBOX_SIZE = { w: 49, h: 43 };
const FILENAME_LEFT = 113;
const SIZE_LEFT = 869;

const pctX = (px) => `${((GROUP.left + px) / CANVAS.w) * 100}%`;
const pctY = (px) => `${((GROUP.top + px) / CANVAS.h) * 100}%`;
const pctW = (px) => `${(px / CANVAS.w) * 100}%`;
const pctH = (px) => `${(px / CANVAS.h) * 100}%`;

export default function ChallengeDescriptionPanel({ description, attachments }) {
  return (
    <>
      <div
        className="absolute left-[6.2%] top-[28.83%] w-[52.08%] h-[58.33%]"
        aria-hidden="true"
      >
        <img
          src="/assets/challenge-detail/panel-description.png"
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      </div>

      {/* 실제 문제 설명 — 시안에는 빈 줄무늬만 있고 텍스트 레이어가 없어 같은 영역에 겹친다. */}
      <p className="absolute left-[8.49%] top-[35.5%] w-[45.83%] h-[24%] overflow-y-auto whitespace-pre-line font-im-fell text-[1.15cqw] leading-[1.4] text-auth-text">
        {description}
      </p>

      {attachments.map((attachment, index) => {
        const offsetY = index * ROW_STEP;
        return (
          <div key={attachment.name}>
            <img
              src="/assets/challenge-detail/icon-checkbox.png"
              alt=""
              aria-hidden="true"
              className="absolute pointer-events-none object-contain"
              style={{
                left: pctX(CHECKBOX_LEFT),
                top: pctY(ROW_BASE.checkbox + offsetY),
                width: pctW(CHECKBOX_SIZE.w),
                height: pctH(CHECKBOX_SIZE.h),
              }}
            />
            <a
              href={attachment.url ?? undefined}
              download
              className="absolute whitespace-nowrap font-kode-mono text-[1.25cqw] text-auth-text no-underline"
              style={{ left: pctX(FILENAME_LEFT), top: pctY(ROW_BASE.filename + offsetY) }}
            >
              {attachment.name}
            </a>
            <span
              className="absolute whitespace-nowrap font-kode-mono text-[1.25cqw] text-detail-size"
              style={{ left: pctX(SIZE_LEFT), top: pctY(ROW_BASE.size + offsetY) }}
            >
              {attachment.sizeLabel}
            </span>
          </div>
        );
      })}
    </>
  );
}
