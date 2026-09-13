import styles from "./ChallengeDetailScreen.module.css";

export default function ChallengeDescriptionPanel({
  description,
  attachments = [],
}) {
  return (
    <section
      className={styles.descriptionPanel}
      aria-labelledby="challenge-description-heading"
    >
      <h2 id="challenge-description-heading" className={styles.sectionHeading}>
        문제 설명
      </h2>
      <div
        className={styles.descriptionBody}
        tabIndex={0}
        aria-label="문제 설명 본문"
      >
        {description || "등록된 설명이 없습니다"}
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
                {attachment.url ? (
                  <a href={attachment.url} download title={attachment.name}>
                    {attachment.name}
                  </a>
                ) : (
                  <span
                    className={styles.attachmentName}
                    title={attachment.name}
                  >
                    {attachment.name}
                  </span>
                )}
                <span className={styles.fileSize}>
                  {attachment.sizeLabel}
                  {attachment.sizeLabel && attachment.sizeLabel !== "-"
                    ? " MB"
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyAttachments}>첨부파일이 없습니다</p>
        )}
      </div>
    </section>
  );
}
