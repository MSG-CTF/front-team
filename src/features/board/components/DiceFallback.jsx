import { Component, forwardRef, useEffect, useImperativeHandle, useState } from "react";

const PIPS = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
};

// 3D를 쓸 수 없는 기기에서도 서버가 돌려준 눈으로 보드 진행을 이어간다
export const DiceFallback = forwardRef(function DiceFallback({ onReady, inCanvas = false, result: initialResult = null }, ref) {
  const [result, setResult] = useState(initialResult);
  useEffect(() => { onReady?.(); }, [onReady]);
  useImperativeHandle(ref, () => ({
    startRoll(next) {
      if (PIPS[next?.diceA] && PIPS[next?.diceB]) setResult(next);
      return Promise.resolve();
    },
  }), []);
  const position = inCanvas
    ? "absolute left-[36.364%] top-[44.444%] h-[11.111%] w-[27.273%]"
    : "absolute left-[15.91%] top-1/4 w-[68.18%] h-1/2";
  return <span className={position} data-dice-fallback="true" aria-hidden="true">
    {PIPS[result?.diceA] && PIPS[result?.diceB] ? (
      <svg viewBox="0 0 240 120" className="h-full w-full drop-shadow-lg">
        {[result.diceA, result.diceB].map((face, index) => <g key={index} transform={`translate(${index * 122 + 8} 8)`}>
          <rect width="102" height="102" rx="15" fill="#efd6a3" stroke="#866335" strokeWidth="3" />
          {PIPS[face].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="8" fill="#382616" />)}
        </g>)}
      </svg>
    ) : <img src="/assets/board/dice.png" alt="" className="h-full w-full object-contain" />}
  </span>;
});

export class DiceErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
