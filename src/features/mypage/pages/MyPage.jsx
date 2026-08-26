import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMyMileageHistory, getMyProfile } from "../../../api/mypage.js";
import { isSuccess } from "../../../utils/response.js";
import MyPageScreen from "../components/MyPageScreen.jsx";
import { PREVIEW_MY_PAGE_DATA } from "../data/previewMyPageData.js";
import { mapMileageHistory, mapTeamProfile } from "../utils/myPageData.js";

const LOADING_STATE = Object.freeze({ status: "loading", data: null });
const SOLVE_HISTORY_API_READY_STATE = Object.freeze({
  status: "unavailable",
  data: [],
});

function resolveResponse(settledResult, mapData, isEmpty) {
  if (settledResult.status === "rejected") {
    return { status: "error", data: null };
  }

  const envelope = settledResult.value?.data;
  if (!isSuccess(envelope)) {
    return { status: "error", data: null };
  }

  if (isEmpty(envelope.data)) {
    return { status: "empty", data: null };
  }

  return { status: "success", data: mapData(envelope.data) };
}

export default function MyPage() {
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "mypage";
  const previewState = useMemo(
    () => ({
      profile: { status: "success", data: PREVIEW_MY_PAGE_DATA.profile },
      mileageHistory: {
        status: "success",
        data: PREVIEW_MY_PAGE_DATA.mileageHistory,
      },
      solveHistory: {
        status: "success",
        data: PREVIEW_MY_PAGE_DATA.solveHistory,
      },
    }),
    [],
  );
  const [apiState, setApiState] = useState({
    profile: LOADING_STATE,
    mileageHistory: LOADING_STATE,
  });

  useEffect(() => {
    if (isPreview) return undefined;

    const controller = new AbortController();
    let active = true;

    setApiState({
      profile: LOADING_STATE,
      mileageHistory: LOADING_STATE,
    });

    Promise.allSettled([
      getMyProfile({ signal: controller.signal }),
      getMyMileageHistory({ signal: controller.signal }),
    ]).then(([profileResult, mileageHistoryResult]) => {
      if (!active) return;

      setApiState({
        profile: resolveResponse(
          profileResult,
          mapTeamProfile,
          (data) => data == null,
        ),
        mileageHistory: resolveResponse(
          mileageHistoryResult,
          mapMileageHistory,
          (data) => !data || !Array.isArray(data.history) || data.history.length === 0,
        ),
      });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isPreview]);

  const viewState = isPreview
    ? previewState
    : {
        ...apiState,
        solveHistory: SOLVE_HISTORY_API_READY_STATE,
      };

  return <MyPageScreen {...viewState} />;
}
