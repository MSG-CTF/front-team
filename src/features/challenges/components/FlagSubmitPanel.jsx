// Figma node 307:91 "FlagSubmitForm" (640x228) — "SUBMIT FLAG" 라벨/입력창 테두리는
// panel-flag.png에 그려져 있어, 실제 입력창과 제출 버튼(307:17)만 겹친다.
// node 95:360에서 placeholder가 flag{...} → MSG{...} 로 바뀌었다.
export default function FlagSubmitPanel({ value, onChange, onSubmit, disabled }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="absolute left-[59.27%] top-[66.02%] w-[33.33%] h-[21.11%]" aria-hidden="true">
        <img
          src="/assets/challenge-detail/panel-flag.png"
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      </div>

      <label htmlFor="flag" className="sr-only">
        플래그
      </label>
      {/* 시안 307:94 FlagPlaceholderText: 캔버스 (1186, 812) 박스 235x30, IM Fell 24px.
          input은 글자를 콘텐츠 박스에 세로 중앙 정렬하므로, 시안 글자 중심 y=827에
          맞추려면 top = 827 - h/2 여야 한다 → h 40px(3.7037%), top 807.5px(74.769%).
          (이전 73.19%는 22px 위에 붙어 있었다.) */}
      <input
        id="flag"
        name="flag"
        type="text"
        placeholder="MSG{...}"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute left-[61.77%] top-[74.769%] w-[28%] h-[3.7037%] bg-transparent border-0 outline-none font-im-fell text-[1.25cqw] leading-[normal] text-auth-text placeholder-auth-text/70"
      />

      <button
        type="submit"
        disabled={disabled}
        aria-label="플래그 제출"
        className="absolute left-[78.85%] top-[80.24%] w-[12.71%] h-[4.91%] bg-no-repeat bg-[length:100%_100%] p-0 border-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundImage: "url(/assets/challenge-detail/button-submit.png)" }}
      >
        <span className="sr-only">제출</span>
      </button>
    </form>
  );
}
