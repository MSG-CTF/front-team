import { useState } from "react";
import { Link } from "react-router-dom";
import AdminDialog from "./AdminDialog.jsx";
import AdminTabs from "./AdminTabs.jsx";
import AdminChallengeSettingsDialog from "./AdminChallengeSettingsDialog.jsx";
import AdminChallengeRuntimeDialog from "./AdminChallengeRuntimeDialog.jsx";
import AdminChallengeSolvesPanel from "./AdminChallengeSolvesPanel.jsx";
import AdminChallengeSubmissionsPanel from "./AdminChallengeSubmissionsPanel.jsx";
import AdminRemoteRunPanel from "./AdminRemoteRunPanel.jsx";
import { AdminBadge } from "./AdminLayout.jsx";
import { Glyph } from "./AdminGlyph.jsx";
import styles from "./AdminWorkspace.module.css";

export default function AdminChallengeManageDialog({ challenge, initialSection = "problem", initialReleaseId, onClose, onChanged }) {
  const [section, setSection] = useState(initialSection);
  const [opened, setOpened] = useState(() => new Set([initialSection]));
  const [title, setTitle] = useState(challenge.title);
  const [problemBusy, setProblemBusy] = useState(false);
  const [deploymentBusy, setDeploymentBusy] = useState(false);
  const [remoteBusy, setRemoteBusy] = useState(false);
  // 실행 파일을 내서 검증 VM에서 돌리는 문제는 원격 실행 탭에서 설정과 실행 기록을 본다
  const remote = Boolean(challenge.remote_run);
  // 기본 정보의 파일 카드에서 배포 설정의 참가자 파일 칸으로 바로 넘긴다
  const [deploymentFocus, setDeploymentFocus] = useState(null);
  const busy = problemBusy || deploymentBusy || remoteBusy;

  function selectSection(next) {
    if (busy) return;
    setOpened((current) => new Set([...current, next]));
    setSection(next);
  }

  async function savedProblem(data) {
    setTitle(data.title);
    return onChanged?.();
  }

  return <AdminDialog title={title} subtitle={challenge.challenge_slug || "저장소 미연결"}
    headerMeta={<>
      <AdminBadge tone={challenge.is_published ? "good" : "neutral"}>{challenge.is_published ? "공개" : "비공개"}</AdminBadge>
      <Link className={styles.headerLink} to={`/admin/challenges/${challenge.challenge_id}/preview`} target="_blank" rel="noreferrer"
        aria-label="참가자 화면 미리보기" title="저장한 내용으로 열립니다"><Glyph name="external" size={13} strokeWidth={2.2} /><span>참가자 화면</span></Link>
    </>}
    onClose={onClose} busy={busy} variant="workspace">
    <AdminTabs idPrefix="challenge-workspace" label="문제 관리" variant="primary" value={section} onChange={selectSection} disabled={busy}
      items={[
        { id: "problem", label: "기본 정보" },
        { id: "deployment", label: "배포 설정" },
        ...(remote ? [{ id: "remote", label: "원격 실행" }] : []),
        { id: "solves", label: "풀이 기록" },
        { id: "submissions", label: "제출 기록" },
      ]}/>
    <section role="tabpanel" id="challenge-workspace-panel-problem" aria-labelledby="challenge-workspace-tab-problem" hidden={section !== "problem"} className={styles.panel}>
      {opened.has("problem") && <AdminChallengeSettingsDialog challenge={challenge} embedded active={section === "problem"}
        onBusyChange={setProblemBusy} onSaved={savedProblem} onOpenFiles={() => { setDeploymentFocus({ panel: "files", at: Date.now() }); selectSection("deployment"); }}/>}
    </section>
    <section role="tabpanel" id="challenge-workspace-panel-deployment" aria-labelledby="challenge-workspace-tab-deployment" hidden={section !== "deployment"} className={styles.panel}>
      {opened.has("deployment") && <AdminChallengeRuntimeDialog challenge={challenge} initialReleaseId={initialReleaseId} embedded active={section === "deployment"}
        focusPanel={deploymentFocus} onBusyChange={setDeploymentBusy} onChanged={onChanged}/>}
    </section>
    {remote && <section role="tabpanel" id="challenge-workspace-panel-remote" aria-labelledby="challenge-workspace-tab-remote" hidden={section !== "remote"} className={styles.panel}>
      {opened.has("remote") && <AdminRemoteRunPanel challenge={challenge} onBusyChange={setRemoteBusy} onChanged={onChanged}/>}
    </section>}
    <section role="tabpanel" id="challenge-workspace-panel-solves" aria-labelledby="challenge-workspace-tab-solves" hidden={section !== "solves"} className={styles.panel}>
      {opened.has("solves") && <AdminChallengeSolvesPanel challengeId={challenge.challenge_id} currentScore={challenge.score}/>}
    </section>
    <section role="tabpanel" id="challenge-workspace-panel-submissions" aria-labelledby="challenge-workspace-tab-submissions" hidden={section !== "submissions"} className={styles.panel}>
      {opened.has("submissions") && <AdminChallengeSubmissionsPanel challengeId={challenge.challenge_id}/>}
    </section>
  </AdminDialog>;
}
