import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChallengeDetailScreen from "../components/ChallengeDetailScreen.jsx";
import { INSTANCE_STATUS } from "../../../constants/enums.js";

// Figma node 95:360 "ChallengeDetailPage". 요청/응답 필드가 아직 확정되지 않아
// (README.md "3. 문제 상세 페이지") 우선 시안 그대로의 목업 데이터로 화면만 잡아둔다.
//
// node 104:459(구 "Koth problem solve page") 기반 KOTH 전용 헤더는 95:360에서
// 일반 category/difficulty/solved 헤더로 대체되었다.
const MOCK_CHALLENGE = {
  title: "BABYHEAP",
  category: "FORENSIC", // 헤더 배지는 3글자로 축약 표시 (FORENSIC → "FOR")
  difficulty: "MEDIUM",
  solved: true,
  points: "500",
  solves: 18,
  description: Array(9).fill("helloworld").join("\n"),
  attachments: [
    { name: "babyheap.tar.zip", sizeLabel: "43", url: null },
    { name: "libc-2.35.so", sizeLabel: "31", url: null },
  ],
};

const MOCK_INSTANCE = {
  status: INSTANCE_STATUS.RUNNING,
  connectUrl: "10.1.32.424:3342",
  remainingSeconds: 1093,
  ttlSeconds: 1800,
  extendsUsed: 1,
  extendsMax: 3,
};

export default function ChallengeDetailPage() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const [flagValue, setFlagValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitFlag = async () => {
    // TODO(challenge-detail): submitFlag({ challengeId, flag }) 연결.
    // 200 OK + code !== "SUCCESS"(예: INCORRECT_FLAG)도 실패로 처리 (README.md 0-2절).
    setSubmitting(true);
    console.log("submit flag", { challengeId, flag: flagValue });
    setSubmitting(false);
  };

  // TODO(challenge-detail): 아래 3개를 src/api/instances.js에 연결 (README.md 3절).
  const handleCreateInstance = () => console.log("create instance", { challengeId });
  const handleExtendInstance = () => console.log("extend instance", { challengeId });
  const handleRestartInstance = () => console.log("restart instance", { challengeId });

  return (
    <ChallengeDetailScreen
      challenge={MOCK_CHALLENGE}
      instance={MOCK_INSTANCE}
      flagValue={flagValue}
      onFlagChange={setFlagValue}
      onSubmitFlag={handleSubmitFlag}
      onCreateInstance={handleCreateInstance}
      onExtendInstance={handleExtendInstance}
      onRestartInstance={handleRestartInstance}
      submitDisabled={submitting || flagValue.length === 0}
      onBack={() => navigate(-1)}
    />
  );
}
