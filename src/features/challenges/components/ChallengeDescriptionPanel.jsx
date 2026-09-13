import styles from "./ChallengeDetailScreen.module.css";

export default function ChallengeDescriptionPanel({
  description,
  attachments = [],
}) {
  return (
    <section
      id="challenge-description"
      className={styles.descriptionPanel}
      aria-labelledby="challenge-description-heading"
      tabIndex={-1}
    >
      <div className={styles.sectionIntro}>
        <span className={styles.sectionNumber} aria-hidden="true">
          01
        </span>
        <h2
          id="challenge-description-heading"
          className={styles.sectionHeading}
        >
          문제 설명
        </h2>
      </div>
      <div className={styles.descriptionBody} aria-label="문제 설명 본문">
        {description ? (
          description
            .split(/\n\s*\n/)
            .map((paragraph, index) => <p key={index}>{paragraph}</p>)
        ) : (
          <p className={styles.emptyText}>등록된 설명이 없습니다</p>
        )}
      </div>
      <div className={styles.attachments}>
        <h3 className={styles.attachmentHeading}>
          첨부파일 <span>{attachments.length}</span>
        </h3>
        {attachments.length > 0 ? (
          <ul className={styles.attachmentList} aria-label="첨부파일">
            {attachments.map((attachment, index) => (
              <li
                key={attachment.fileId ?? index}
                className={styles.attachmentRow}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M7 3h7l4 4v14H7zM14 3v5h4M10 12h5M10 16h5" />
                </svg>
                <div className={styles.attachmentInfo}>
                  {attachment.url ? (
                    <a href={attachment.url} download title={attachment.name}>
                      {attachment.name}
                    </a>
                  ) : (
                    <span className={styles.attachmentName}>
                      {attachment.name}
                    </span>
                  )}
                  <span className={styles.fileSize}>
                    {attachment.sizeLabel}
                    {!attachment.url && " · 다운로드 준비 중"}
                  </span>
                </div>
                {attachment.url && (
                  <span className={styles.downloadIcon} aria-hidden="true">
                    ↓
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyAttachments}>
            이 문제에는 첨부파일이 없습니다
          </p>
        )}
      </div>
    </section>
  );
}
