import { getAdminChallengeFlag } from "../../../api/admin.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { FLAG_BINDING_STATES } from "../utils/adminChallengeSettings.js";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import styles from "./AdminWorkspace.module.css";

export default function AdminActiveFlagBindings({ challengeId, releaseVersion }) {
  const flag = useAdminResource((config) => getAdminChallengeFlag(challengeId, config), [challengeId, releaseVersion], "플래그 연결을 확인하지 못했습니다");
  const data = flag.data;
  return <>
    <AdminStatusMessage status={flag.status} error={flag.error} onRetry={flag.retry}/>
    {flag.status === "success" && (data.release_version !== releaseVersion
      ? <p className={styles.fileNotice}>사용 중인 배포 버전이 바뀌었습니다 배포 설정을 새로고침해주세요</p>
      : data.bindings.length ? <div className={styles.tableWrap}>
        <table className={styles.settingsTable} aria-label="플래그 주입 연결">
          <thead><tr><th>컨테이너 / 환경변수</th><th>연결한 비밀값</th><th>채점 값 비교</th></tr></thead>
          <tbody>{data.bindings.map((binding) => <tr key={`${binding.container}:${binding.env_name}`}>
            <td className={styles.mono}>{binding.container} / {binding.env_name}</td>
            <td>{binding.secret_name ? `${binding.secret_name} · 버전 ${binding.secret_version}` : "연결 없음"}</td>
            <td><AdminBadge tone={binding.status === "match" ? "good" : "bad"}>{FLAG_BINDING_STATES[binding.status] ?? "확인 필요"}</AdminBadge></td>
          </tr>)}</tbody>
        </table>
      </div> : <p className={styles.helpText}>이 버전에 연결된 플래그 비밀값이 없습니다 파일로 전달하는 플래그는 실행 파일에서 확인해주세요</p>)}
  </>;
}
