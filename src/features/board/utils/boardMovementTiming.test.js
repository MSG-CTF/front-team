import test from "node:test";
import assert from "node:assert/strict";
import { crossesBoardStart, getBoardMovementTiming } from "./boardMovementTiming.js";

test("일반 이동은 215ms 대기와 180ms transition을 유지한다", () => {
  for (const [from, path] of [[10,[11,12,13,14,15]],[28,[29,30,31,32,33,34]]]) {
    assert.equal(crossesBoardStart(from,path),false);
    assert.deepEqual(getBoardMovementTiming(from,path,true),{stepMs:215,transitionMs:180});
  }
});

test("36→1 주사위 이동은 START 도착을 포함해 모든 칸을 1.75배속으로 이동한다", () => {
  for (const [from,path] of [[33,[34,35,36,1,2,3]],[35,[36,1]],[36,[1]]]) {
    const original=[...path];
    assert.equal(crossesBoardStart(from,path),true);
    assert.deepEqual(getBoardMovementTiming(from,path,true),{stepMs:215/1.75,transitionMs:180/1.75});
    assert.deepEqual(path,original);
    assert.equal(path.at(-1),original.at(-1));
    assert.deepEqual(getBoardMovementTiming(from,path),{stepMs:215,transitionMs:180});
  }
});

test("번호만 작아지는 점프나 역행, START에서 출발하는 이동은 가속하지 않는다", () => {
  for (const [from,path] of [[35,[3]],[1,[36,35]],[1,[2,3]], [33,[]], [33,[36,1,37]], [33,null]]) {
    assert.equal(crossesBoardStart(from,path),false);
    assert.deepEqual(getBoardMovementTiming(from,path,true),{stepMs:215,transitionMs:180});
  }
});
