import { Component } from "react";

export default class RouteLoadBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#21150d] px-6 font-inria-serif text-[#f8ead0]" role="alert">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold">화면을 불러오지 못했습니다</h1>
          <p className="mt-3 leading-relaxed">연결을 확인한 뒤 다시 시도해 주세요</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 min-h-11 border border-[#b98b4f] px-6 py-2 hover:bg-[#3a2615] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f1cb79]">
            다시 불러오기
          </button>
        </div>
      </div>
    );
  }
}
