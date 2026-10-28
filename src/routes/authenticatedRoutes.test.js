import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement, Children } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter, Route, Routes } from "react-router-dom";
import { createServer } from "vite";

let server, AppRoutes, AuthenticatedRoute, AdminRoute;
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
let token = null;

before(async () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => token },
  });
  server = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
    cacheDir: "node_modules/.vite-auth-route-tests",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  [AppRoutes, AuthenticatedRoute, AdminRoute] = await Promise.all([
    "/src/routes/AppRoutes.jsx",
    "/src/routes/AuthenticatedRoute.jsx",
    "/src/routes/AdminRoute.jsx",
  ].map(async (path) => (await server.ssrLoadModule(path)).default));
});

after(async () => {
  await server?.close();
  if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor);
  else delete globalThis.localStorage;
});

test("홍보와 참가 안내, 로그인 외 모든 등록 경로에 서버 인증 가드가 있다", () => {
  const paths = [];
  function InspectRoutes() {
    function walk(node, protectedRoute = false) {
      if (!node?.props) return;
      const guarded = protectedRoute || node.props.element?.type === AuthenticatedRoute;
      if (node.type === Route && node.props.path) {
        paths.push({ path: node.props.path, protected: guarded, admin: node.props.element?.type === AdminRoute });
      }
      Children.forEach(node.props.children, (child) => walk(child, guarded));
    }
    walk(AppRoutes());
    return null;
  }
  renderToStaticMarkup(createElement(StaticRouter, { location: "/board" }, createElement(InspectRoutes)));
  assert.ok(paths.length >= 25);
  for (const route of paths) {
    // API와 분리된 개발 전용 디자인 미리보기는 인증/게임 상태를 읽지 않는다.
    if (["/", "/guide", "/login", "*", "/dev/golden-key-preview", "/dev/booth-menu-preview", "/dev/remote-run-preview", "/dev/countdown-preview"].includes(route.path)) assert.equal(route.protected, false, route.path);
    else assert.equal(route.protected, true, route.path);
    if (route.path.startsWith("/admin")) assert.equal(route.admin, true, route.path);
  }
});

test("토큰이 없으면 보호된 화면을 렌더링하지 않는다", () => {
  token = null;
  const html = renderToStaticMarkup(createElement(StaticRouter, { location: "/private" },
    createElement(Routes, null,
      createElement(Route, { element: createElement(AuthenticatedRoute) },
        createElement(Route, { path: "/private", element: createElement("div", null, "비공개 화면") })),
    ),
  ));
  assert.doesNotMatch(html, /비공개 화면/);
});

test("토큰이 있어도 서버 확인 전에는 보호된 화면을 렌더링하지 않는다", () => {
  token = "local-test-token";
  const html = renderToStaticMarkup(createElement(StaticRouter, { location: "/private" },
    createElement(Routes, null,
      createElement(Route, { element: createElement(AuthenticatedRoute) },
        createElement(Route, { path: "/private", element: createElement("div", null, "비공개 화면") })),
    ),
  ));
  assert.match(html, /로그인 확인 중/);
  assert.doesNotMatch(html, /비공개 화면/);
});

test("인증 문맥 없이 관리자 가드를 사용해도 화면을 열지 않는다", () => {
  const html = renderToStaticMarkup(createElement(StaticRouter, { location: "/admin" },
    createElement(AdminRoute, null, createElement("div", null, "관리자 비공개 화면")),
  ));
  assert.doesNotMatch(html, /관리자 비공개 화면/);
});

test("관리자 판정은 저장된 role 대신 서버 확인 문맥만 사용한다", () => {
  const guard = readFileSync(new URL("./AdminRoute.jsx", import.meta.url), "utf8");
  assert.match(guard, /useAuthenticatedUser\(\)/);
  assert.doesNotMatch(guard, /localStorage|ROLE_STORAGE_KEY|getMe\(/);
  const session = readFileSync(new URL("./AuthenticatedRoute.jsx", import.meta.url), "utf8");
  assert.match(session, /getMe\(\{ signal: controller.signal, timeout: 10000 \}\)/);
  assert.match(session, /isSuccess\(response.data\)/);
  assert.match(session, /controller.abort\(\)/);
});
