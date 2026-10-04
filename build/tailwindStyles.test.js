import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const entry = new URL("../src/index.css", import.meta.url);
const compiled = await postcss([tailwindcss()]).process(readFileSync(entry, "utf8"), { from: fileURLToPath(entry) });
const declarations = [];
compiled.root.walkDecls((declaration) => declarations.push(declaration));

test("Tailwind 4도 기존 게임 폰트와 사용자 팔레트를 빌드한다", () => {
  for (const value of ["#613d15", "#d38e25", "#6c8e4a", "Song Myung", "IM Fell English", "Pretendard"]) {
    assert.ok(compiled.css.includes(value), `missing theme value: ${value}`);
  }
  assert.ok(declarations.some((declaration) => declaration.prop === "font-family" && declaration.parent.selector === "html, :host" && declaration.value.startsWith("ui-sans-serif, system-ui, sans-serif")));
});

test("@container와 cqw 화면 크기 유틸리티를 유지한다", () => {
  assert.ok(declarations.some((declaration) => declaration.prop === "container-type" && declaration.value === "inline-size"));
  assert.ok(declarations.some((declaration) => declaration.prop === "width" && declaration.value.replace(/\s/g, "") === "min(100vw,177.78vh)"));
  assert.ok(declarations.some((declaration) => declaration.prop === "font-size" && declaration.value.includes("cqw")));
});

test("공통 무대는 translate 속성을 겹치지 않아 모바일 transform 해제가 유지된다", () => {
  const stage = readFileSync(new URL("../src/components/common/FixedAspectStage.jsx", import.meta.url), "utf8");
  assert.match(stage, /\[transform:translate\(-50%,-50%\)\]/);
  assert.doesNotMatch(stage, /-translate-[xy]-1\/2/);
  assert.ok(declarations.some((declaration) => declaration.prop === "transform" && declaration.value.replace(/\s/g, "") === "translate(-50%,-50%)"));
});

test("기본 테두리와 입력 안내색은 이전 화면 값을 유지한다", () => {
  assert.ok(declarations.some((declaration) => declaration.prop === "border-color" && declaration.value === "#e5e7eb"));
  assert.ok(declarations.some((declaration) => declaration.prop === "color" && declaration.value === "#9ca3af" && declaration.parent.selector.includes("placeholder")));
});

test("화면별 글자 크기 변경이 기존 행 간격을 줄이지 않는다", () => {
  for (const [size, height] of [["xs", "1rem"], ["sm", "1.25rem"], ["lg", "1.75rem"], ["xl", "1.75rem"]]) {
    assert.ok(declarations.some((declaration) => declaration.prop === `--text-${size}--line-height` && declaration.value === height));
  }
});

test("단위 테스트와 보안 검사 모두 통과해야 이미지 발행이 실행된다", () => {
  const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert.match(workflow, /frontend-tests:[\s\S]*?run: npm test/);
  assert.match(workflow, /supply-chain-build-scan-push:\s*needs: \[frontend-code-scan, frontend-tests\]/);
});
