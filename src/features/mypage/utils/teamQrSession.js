import { isSuccess } from "../../../utils/response.js";
import { getQrRemainingSeconds } from "./myPageData.js";

export const QR_IDLE = { status: "idle", teamId: null, paymentToken: "", expiresAt: "", remainingSeconds: null, error: "" };

export function getQrTeamId(profile) {
  return profile.status === "success" && !profile.error && !profile.data?.isBanned
    && typeof profile.data?.teamId === "string" && profile.data.teamId ? profile.data.teamId : null;
}

// 팀을 확인한 요청만 QR을 표시한다 늦게 온 이전 요청은 새 요청의 상태도 건드리지 않는다
export function createTeamQrSession({ getProfile, issueQr, updateState, onMembershipChange, remainingSeconds = getQrRemainingSeconds }) {
  let teamId = null;
  let generation = 0;
  let pending = null;

  function clear(notify = true) {
    generation += 1;
    pending?.controller.abort();
    pending = null;
    teamId = null;
    if (notify) updateState(QR_IDLE);
  }

  function setTeam(nextTeamId) {
    if (nextTeamId === teamId) return;
    clear();
    teamId = nextTeamId;
  }

  async function request() {
    if (!teamId || pending) return;
    const ticket = { teamId, generation, controller: new AbortController() };
    pending = ticket;
    const current = () => pending === ticket && generation === ticket.generation && teamId === ticket.teamId;
    const config = { signal: ticket.controller.signal, timeout: 10000 };
    const publish = (state) => { if (current()) updateState({ ...state, teamId: ticket.teamId }); };
    const changed = () => { clear(); onMembershipChange(); };
    async function verifyTeam() {
      const response = await getProfile(config);
      if (!current()) return false;
      if (!isSuccess(response.data)) throw new Error("소속 팀을 확인하지 못했습니다");
      if (response.data.data?.team_id !== ticket.teamId || response.data.data?.is_banned) {
        changed();
        return false;
      }
      return true;
    }

    publish({ ...QR_IDLE, status: "loading" });
    try {
      if (!await verifyTeam()) return;
      const response = await issueQr(config);
      if (!current()) return;
      const envelope = response.data;
      if (isSuccess(envelope)) {
        const issuedTeamId = envelope.data?.team_id;
        if (typeof issuedTeamId !== "string" || !issuedTeamId.trim()) {
          publish({ ...QR_IDLE, status: "error", error: "QR의 소속 팀을 확인하지 못했습니다" });
          return;
        }
        // 전후 조회가 같은 팀이어도 중간에 다른 팀에서 발급됐을 수 있다
        if (issuedTeamId !== ticket.teamId) { changed(); return; }
      }
      // 발급 도중 팀이 바뀌면 서버의 정상 응답도 이전 팀 QR일 수 있다
      if (!await verifyTeam()) return;
      const paymentToken = envelope?.data?.payment_token;
      const expiresAt = envelope?.data?.expires_at;
      const left = remainingSeconds(expiresAt);
      if (!isSuccess(envelope) || typeof paymentToken !== "string" || !paymentToken.trim() || left == null) {
        publish({ ...QR_IDLE, status: "error", error: envelope?.message || "QR 발급 응답을 확인하지 못했습니다" });
      } else {
        publish({ ...QR_IDLE, status: left > 0 ? "success" : "expired", paymentToken: left > 0 ? paymentToken : "", expiresAt, remainingSeconds: left });
      }
    } catch (error) {
      if (!current()) return;
      if (error?.response?.data?.code === "USER_HAS_NO_TEAM") changed();
      else publish({ ...QR_IDLE, status: "error", error: error?.response?.data?.message || error.message || "QR 발급 응답을 확인하지 못했습니다" });
    } finally {
      if (pending === ticket) pending = null;
    }
  }

  return { setTeam, request, dispose: () => clear(false) };
}
