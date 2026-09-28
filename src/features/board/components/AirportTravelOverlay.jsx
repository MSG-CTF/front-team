// Figma node 555:342 "기차여행"(안내 문구 555:366) - Airport(기차 칸)에 도착하면 보드 가운데에
// "가고 싶은 장소를 골라주세요!" 안내가 뜨고, 참가자는 보드 칸을 직접 눌러 목적지를
// 고른다. 고른 뒤에는 작은 확인 패널에서 이동을 확정한다(POST /board/airport/move, 팀장만).
// 팀당 1회만 쓸 수 있고, 아직 소모하지 않은 칸만 고를 수 있다.
import styles from "./BoardScreen.module.css";

export default function AirportTravelOverlay({ destination, isMutating, onConfirm, onCancel }) {
  return (
    <>
      {!destination && (
        <p
          role="status"
          // 시안 555:366: Pretendard Bold 36px, #e5dccc, 자간 6.12px, 687,506 (1920x1080 무대)
          className={`${styles.airportHint} pointer-events-none absolute left-[35.78%] top-[46.85%] z-30 m-0 whitespace-nowrap font-pretendard text-[1.875cqw] font-bold leading-none tracking-[0.319cqw] text-[#e5dccc] [text-shadow:0_0.08cqw_0.4cqw_rgba(0,0,0,0.75)]`}
        >
          가고 싶은 장소를 골라주세요!
        </p>
      )}

      {destination && (
        <section
          aria-label="기차여행 목적지 확인"
          className={`${styles.airportConfirm} absolute left-[36.6%] top-[40%] z-40 w-[23%] rounded-[0.55cqw] border-[0.16cqw] border-[#8a5a2b] bg-[#efe1c4]/95 px-[1cqw] py-[0.8cqw] text-center text-[#3b2616] shadow-[0_0.6cqw_1.6cqw_rgba(30,12,2,0.55),inset_0_0_0_0.12cqw_#f8eedb]`}
        >
          <h2 className="m-0 font-pretendard text-[0.95cqw] font-normal">기차여행</h2>
          <p className="m-0 mt-[0.45cqw] font-pretendard text-[0.72cqw]">
            <strong className="font-inria-serif text-[0.9cqw] text-[#7a2420]">{destination.cellIndex}번</strong>{" "}
            {destination.name ? `${destination.name} ` : ""}칸으로 이동할까요?
          </p>
          <p className="m-0 mt-[0.25cqw] font-pretendard text-[0.55cqw] text-[#6d5238]">
            기차여행은 팀마다 한 번만 쓸 수 있습니다.
          </p>
          <div className="mt-[0.6cqw] flex justify-center gap-[0.5cqw]">
            <button
              type="button"
              disabled={isMutating}
              onClick={onCancel}
              className="rounded-[0.3cqw] border border-[#8a5a2b] bg-transparent px-[0.8cqw] py-[0.35cqw] font-pretendard text-[0.66cqw] text-[#3b2616] hover:bg-[#f6ead2] disabled:opacity-60"
            >
              다시 고르기
            </button>
            <button
              type="button"
              disabled={isMutating}
              onClick={() => onConfirm(destination.cellIndex)}
              className="rounded-[0.3cqw] border border-[#c9a15f] bg-[#6e1f1c] px-[0.8cqw] py-[0.35cqw] font-pretendard text-[0.66cqw] text-[#f6e7c8] hover:bg-[#842622] disabled:cursor-wait disabled:opacity-60"
            >
              {isMutating ? "이동 중" : "이동하기"}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
