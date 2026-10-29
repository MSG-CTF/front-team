import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import postcss from "postcss";

const GENERATED = [
  "src/styles/pretendard/mypage.generated.css",
  "src/styles/pretendard/detail.generated.css",
  "src/styles/pretendard/tooltip.generated.css",
  "src/styles/pretendard/payment.generated.css",
  "public/assets/fonts/pretendard/pretendard.generated.css",
  "src/features/intro/intro-fonts.generated.css",
  "src/features/signatures/components/booth-fonts.generated.css",
];

function faces(path) {
  const list = [];
  postcss.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")).walkAtRules("font-face", (rule) => {
    const face = {};
    rule.walkDecls((decl) => { face[decl.prop] = decl.value; });
    face.url = face.src.match(/url\("([^"?]+)/)[1];
    list.push(face);
  });
  return list;
}

test("원본 글꼴도 자기 글자 범위만 맡아 이모지 같은 없는 글자 때문에 통파일을 받지 않는다", () => {
  for (const path of GENERATED) {
    const list = faces(path);
    assert.ok(list.length > 1, path);
    for (const face of list) {
      assert.ok(face["unicode-range"], `${path}: ${face.url}`);
      assert.ok(existsSync(new URL(`../../public${face.url}`, import.meta.url)), face.url);
    }
  }
});

test("같은 글꼴과 굵기에서는 원본을 먼저 두고 조각을 뒤에 둬 조각이 먼저 쓰인다", () => {
  for (const path of GENERATED) {
    const seen = new Map();
    for (const face of faces(path)) {
      const key = `${face["font-family"]}|${face["font-weight"] ?? "normal"}`;
      const isPart = face.url.includes("/subsets/");
      if (!seen.has(key)) {
        assert.equal(isPart, false, `${path}: ${key} 첫 face는 원본이어야 한다`);
        seen.set(key, 0);
      } else {
        assert.equal(isPart, true, `${path}: ${key} 원본 뒤에는 조각만 둔다`);
        seen.set(key, seen.get(key) + 1);
      }
    }
    for (const [key, parts] of seen) assert.ok(parts > 0, `${path}: ${key} 조각이 없다`);
  }
});
