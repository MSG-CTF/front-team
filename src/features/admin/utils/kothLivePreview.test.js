import test from "node:test";
import assert from "node:assert/strict";
import { kothLivePreviewUrl } from "./kothLivePreview.js";

const good = { preview_url: "https://game.example/__operator/preview#ticket=owned-test", expires_in_seconds: 300 };
test("administrator preview accepts only the configured game origin and bounded grant", () => {
  assert.equal(kothLivePreviewUrl(good, "https://game.example"), good.preview_url);
  for (const patch of [
    { preview_url: "https://other.example/__operator/preview#ticket=x" },
    { preview_url: "http://game.example/__operator/preview#ticket=x" },
    { preview_url: "https://a:b@game.example/__operator/preview#ticket=x" },
    { preview_url: "https://game.example/other#ticket=x" },
    { preview_url: "https://game.example/__operator/preview#ticket=" },
    { preview_url: "https://game.example/__operator/preview#ticket=x&ticket=y" },
    { preview_url: "https://game.example/__operator/preview#ticket=x&url=https://other.example" },
    { preview_url: "https://game.example/__operator/preview?ticket=x" },
    { expires_in_seconds: 0 }, { expires_in_seconds: 301 }, { expires_in_seconds: "300" },
  ]) assert.throws(() => kothLivePreviewUrl({ ...good, ...patch }, "https://game.example"));
  assert.throws(() => kothLivePreviewUrl(good, "http://game.example"));
});
