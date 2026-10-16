import { useState } from "react";
import AdminDialog from "./AdminDialog.jsx";
import AdminTabs from "./AdminTabs.jsx";
import AdminChallengeSettingsDialog from "./AdminChallengeSettingsDialog.jsx";
import AdminChallengeRuntimeDialog from "./AdminChallengeRuntimeDialog.jsx";
import AdminChallengeSolvesPanel from "./AdminChallengeSolvesPanel.jsx";
import { AdminBadge } from "./AdminLayout.jsx";
import styles from "./AdminWorkspace.module.css";

export default function AdminChallengeManageDialog({ challenge, initialSection = "problem", initialReleaseId, onClose, onChanged }) {
  const [section, setSection] = useState(initialSection);
  const [opened, setOpened] = useState(() => new Set([initialSection]));
  const [title, setTitle] = useState(challenge.title);
  const [problemBusy, setProblemBusy] = useState(false);
  const [deploymentBusy, setDeploymentBusy] = useState(false);
  const busy = problemBusy || deploymentBusy;

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
    headerMeta={<AdminBadge tone={challenge.is_published ? "good" : "neutral"}>{challenge.is_published ? "공개" : "비공개"}</AdminBadge>}
    onClose={onClose} busy={busy} variant="workspace">
    <AdminTabs idPrefix="challenge-workspace" label="문제 관리" variant="primary" value={section} onChange={selectSection} disabled={busy}
      items={[
        { id: "problem", label: "기본 정보" },
        { id: "deployment", label: "배포 설정" },
        { id: "solves", label: "풀이 기록" },
      ]}/>
    <section role="tabpanel" id="challenge-workspace-panel-problem" aria-labelledby="challenge-workspace-tab-problem" hidden={section !== "problem"} className={styles.panel}>
      {opened.has("problem") && <AdminChallengeSettingsDialog challenge={challenge} embedded active={section === "problem"}
        onBusyChange={setProblemBusy} onSaved={savedProblem}/>}
    </section>
    <section role="tabpanel" id="challenge-workspace-panel-deployment" aria-labelledby="challenge-workspace-tab-deployment" hidden={section !== "deployment"} className={styles.panel}>
      {opened.has("deployment") && <AdminChallengeRuntimeDialog challenge={challenge} initialReleaseId={initialReleaseId} embedded active={section === "deployment"}
        onBusyChange={setDeploymentBusy} onChanged={onChanged}/>}
    </section>
    <section role="tabpanel" id="challenge-workspace-panel-solves" aria-labelledby="challenge-workspace-tab-solves" hidden={section !== "solves"} className={styles.panel}>
      {opened.has("solves") && <AdminChallengeSolvesPanel challengeId={challenge.challenge_id}/>}
    </section>
  </AdminDialog>;
}
