import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import OpenChallengesScreen from "../components/OpenChallengesScreen.jsx";
import useOpenChallenges from "../hooks/useOpenChallenges.js";

export default function OpenChallengesPage() {
  const navigate = useNavigate();
  const openChallenges = useOpenChallenges();
  return (
    <OpenChallengesScreen
      {...openChallenges}
      onRetry={openChallenges.retry}
      onBackToBoard={() => navigate(ROUTES.board)}
      onSelectChallenge={(challengeId) =>
        navigate(ROUTES.challengeDetail(challengeId))
      }
    />
  );
}
