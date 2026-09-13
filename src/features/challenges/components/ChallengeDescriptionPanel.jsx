// Figma node 307:23의 설명 영역과 첨부파일 첫 두 행 위치를 유지한다
export default function ChallengeDescriptionPanel({ description, attachments = [] }) {
  return (
    <>
      <div className="absolute left-[6.2%] top-[28.83%] w-[52.08%] h-[58.33%]" aria-hidden="true">
        <img src="/assets/challenge-detail/panel-description.png" alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
      </div>
      <p className="absolute left-[8.49%] top-[35.49%] w-[45.83%] h-[26.6%] overflow-y-auto whitespace-pre-line break-words font-im-fell text-[1.25cqw] leading-[1.2552] text-auth-text">
        {description}
      </p>
      <div className="absolute left-[8.49%] top-[71.97%] w-[45.83%] h-[14.8%] overflow-y-auto" aria-label="첨부파일">
        {attachments.map((attachment, index) => (
          <div key={attachment.fileId ?? index} className="flex h-[4.01cqw] items-start gap-[1.04cqw] pr-[3cqw] font-kode-mono text-[1.25cqw] text-auth-text">
            <img src="/assets/challenge-detail/icon-checkbox.png" alt="" className="w-[2.55cqw] h-[2.24cqw] object-contain" />
            {attachment.url ? (
              <a href={attachment.url} download title={attachment.name} className="min-w-0 flex-1 truncate pt-[0.3cqw] underline">{attachment.name}</a>
            ) : <span title={attachment.name} className="min-w-0 flex-1 truncate pt-[0.3cqw]">{attachment.name}</span>}
            <span className="pt-[0.16cqw] text-detail-size">{attachment.sizeLabel}</span>
          </div>
        ))}
      </div>
    </>
  );
}
