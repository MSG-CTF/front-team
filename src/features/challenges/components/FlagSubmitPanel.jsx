// Figma node 104:464 그룹 (panel-flag) — "SUBMIT FLAG" 라벨/입력창 테두리는
// panel-flag.png에 이미 그려져 있어, 실제 입력창과 제출 버튼만 그 위에 겹친다.
export default function FlagSubmitPanel({ value, onChange, onSubmit, disabled }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="absolute left-[59.9%] top-[62.59%] w-[33.33%] h-[21.11%]" aria-hidden="true">
        <img
          src="/assets/challenge-detail/panel-flag.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      </div>

      <label htmlFor="flag" className="sr-only">
        플래그
      </label>
      <input
        id="flag"
        name="flag"
        type="text"
        placeholder="flag{...}"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute left-[61.46%] top-[70.19%] w-[30.21%] h-[5.09%] bg-transparent border-0 outline-none font-im-fell text-[1.25cqw] text-auth-text placeholder-auth-text/50"
      />

      <button
        type="submit"
        disabled={disabled}
        aria-label="플래그 제출"
        className="absolute left-[79.48%] top-[76.57%] w-[12.71%] h-[4.91%] bg-no-repeat bg-[length:100%_100%] p-0 border-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundImage: "url(/assets/challenge-detail/button-submit.png)" }}
      >
        <span className="sr-only">제출</span>
      </button>
    </form>
  );
}
