import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChallengeDetailScreen from "../components/ChallengeDetailScreen.jsx";
import { INSTANCE_STATUS } from "../../../constants/enums.js";

// TODO: features/challenges/api.js(getChallengeDetail) + features/instances 연동.
// 요청/응답 필드가 아직 확정되지 않아(README.md "3. 문제 상세 페이지" 참고)
// 우선 Figma 시안 그대로의 목업 데이터로 화면만 잡아둠.
const MOCK_CHALLENGE = {
  title: "BABYHEAP",
  isKoth: true, // 킹힐(King of the Hill) 문제 여부
  kothRank: "1st", // 우리 팀의 현재 KOTH 순위
  solved: true,
  points: "500/M",
  solves: 18,
  description: "",
  attachments: [
    { name: "babyheap.tar.zip", sizeLabel: "43", url: null },
    { name: "libc-2.35.so", sizeLabel: "31", url: null },
  ],
};

const MOCK_INSTANCE = {
  status: INSTANCE_STATUS.RUNNING,
  connectUrl: "https://.....",
  remainingSeconds: 1800,
  ttlSeconds: 3600,
};

export default function ChallengeDetailPage() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const [flagValue, setFlagValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitFlag = async () => {
    // TODO: submitFlag({ challengeId, flag: flagValue }) 연결.
    // 200 OK + code !== "SUCCESS"(예: INCORRECT_FLAG)도 실패로 처리해야 함
    // (공통 규약 "성공 판정 규칙" 참고).
    setSubmitting(true);
    console.log("submit flag", { challengeId, flag: flagValue });
    setSubmitting(false);
  };

  return (
    <ChallengeDetailScreen
      challenge={MOCK_CHALLENGE}
      instance={MOCK_INSTANCE}
      flagValue={flagValue}
      onFlagChange={setFlagValue}
      onSubmitFlag={handleSubmitFlag}
      submitDisabled={submitting || flagValue.length === 0}
      onBack={() => navigate(-1)}
    />
  );
}
