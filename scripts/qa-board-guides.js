// Run with playwright-cli run-code --filename on an authenticated /challenges page (local fixtures or a real session).
// This script only reads the UI. It measures the visible edges of the board HUD, draws them, and checks
// that each group shares one line: left column (dice, chance and open-list plates and the open challenges panel),
// right column, top margin line, the shared top of the open panel and the KoTH banner, and bottom margin line.
// Images keep transparent margins, so ART holds the alpha >= 40 bounds of each PNG as fractions.
// qaOutput selects the screenshot folder; qaSizes defaults to 1920x1080,1366x768,1280x1024,2560x1080.
async page => {
  const url = new URL(page.url());
  const output = url.searchParams.get('qaOutput') || 'output/playwright/board-guides';
  const sizes = (url.searchParams.get('qaSizes') || '1920x1080,1366x768,1280x1024,2560x1080').split(',').map(size => size.split('x').map(Number));
  const ART = {
    'nav-rules.png': { w: 201, h: 134, l: 0.2388, t: 0.0746, r: 0.7562, b: 0.8507 },
    'nav-mypage.png': { w: 257, h: 171, l: 0.3113, t: 0.1871, r: 0.6848, b: 0.7427 },
    'nav-scoreboard.png': { w: 235, h: 157, l: 0.2936, t: 0.1847, r: 0.7021, b: 0.7834 },
    'nav-logout.png': { w: 235, h: 157, l: 0.2936, t: 0.1847, r: 0.7021, b: 0.7834 },
    'banner-koth-event.png': { w: 339, h: 627, l: 0.1534, t: 0.0144, r: 0.8437, b: 0.9841 },
  };
  const SUBJECTS = [
    { key: 'dice', name: '주사위판', css: "[class*='_leftPanel_'] [class*='_diceStatus_']" },
    { key: 'chance', name: '찬스카드', css: "[class*='_leftPanel_'] [class*='_chancePanel_']" },
    { key: 'toggle', name: '목록 버튼', css: "[class*='_panelToggleSection_']" },
    { key: 'open', name: '열린 문제', css: '#board-open-challenges-panel' },
    { key: 'rules', name: '규칙', css: "img[src*='nav-rules']", art: 'nav-rules.png', fit: 'contain' },
    { key: 'mypage', name: '마이', css: "img[src*='nav-mypage']", art: 'nav-mypage.png', fit: 'contain' },
    { key: 'score', name: '순위', css: "img[src*='nav-scoreboard']", art: 'nav-scoreboard.png', fit: 'contain' },
    { key: 'logout', name: '로그아웃', css: "img[src*='nav-logout']", art: 'nav-logout.png', fit: 'contain' },
    { key: 'banner', name: 'KoTH 배너', css: "img[src*='banner-koth-event']", art: 'banner-koth-event.png', fit: 'contain' },
    { key: 'booth', name: '부스 버튼', text: '동아리 부스 둘러보기' },
  ];
  const RULES = [
    ['왼쪽 열 왼쪽 끝', 'x', ['dice.l', 'chance.l', 'toggle.l', 'open.l']],
    ['왼쪽 열 오른쪽 끝', 'x', ['dice.r', 'chance.r', 'toggle.r', 'open.r']],
    ['오른쪽 열 오른쪽 끝', 'x', ['logout.r', 'banner.r', 'booth.r']],
    ['위 여백선', 'y', ['dice.t', 'rules.t', 'mypage.t', 'score.t', 'logout.t']],
    ['두 열 위선', 'y', ['open.t', 'banner.t']],
    ['아래 여백선', 'y', ['open.b', 'booth.b']],
  ];
  const results = [];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.goto(url.origin + '/challenges' + url.search, { waitUntil: 'load' });
    await page.locator('#board-open-challenges-panel').waitFor({ timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    const found = await page.evaluate(({ subjects, art }) => {
      const shown = node => { const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; };
      const out = {};
      for (const subject of subjects) {
        const node = subject.text
          ? [...document.querySelectorAll('button, a')].find(item => item.textContent.includes(subject.text) && shown(item))
          : [...document.querySelectorAll(subject.css)].find(shown);
        if (!node) continue;
        const box = node.getBoundingClientRect();
        let rect = { l: box.left, t: box.top, r: box.right, b: box.bottom };
        const bounds = subject.art && art[subject.art];
        if (bounds) {
          let x = box.left, y = box.top, w = box.width, h = box.height;
          if (subject.fit === 'contain') {
            const scale = Math.min(box.width / bounds.w, box.height / bounds.h);
            w = bounds.w * scale; h = bounds.h * scale;
            x = box.left + (box.width - w) / 2; y = box.top + (box.height - h) / 2;
          }
          rect = { l: x + bounds.l * w, t: y + bounds.t * h, r: x + bounds.r * w, b: y + bounds.b * h };
        }
        out[subject.key] = { name: subject.name, ...Object.fromEntries(Object.entries(rect).map(([key, value]) => [key, Math.round(value * 10) / 10])) };
      }
      return out;
    }, { subjects: SUBJECTS, art: ART });
    const rules = RULES.map(([name, axis, keys]) => {
      const edges = keys.map(key => { const [subject, side] = key.split('.'); return found[subject] && { name: found[subject].name, value: found[subject][side] }; }).filter(Boolean);
      const values = edges.map(edge => edge.value);
      return { name, axis, edges, spread: Math.round((Math.max(...values) - Math.min(...values)) * 10) / 10 };
    });
    await page.evaluate(({ found, rules, width, height }) => {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('width', width); svg.setAttribute('height', height);
      Object.assign(svg.style, { position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none' });
      const add = (tag, attrs, text) => { const node = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value)); if (text) node.textContent = text; svg.appendChild(node); };
      Object.values(found).forEach(item => add('rect', { x: item.l, y: item.t, width: item.r - item.l, height: item.b - item.t, fill: 'none', stroke: '#00e0ff', 'stroke-width': 1.5 }));
      rules.forEach((rule, index) => {
        const color = rule.spread <= 1 ? '#2ee86b' : '#ff3b6b';
        rule.edges.forEach(edge => rule.axis === 'x'
          ? add('line', { x1: edge.value, y1: 0, x2: edge.value, y2: height, stroke: color, 'stroke-dasharray': '6 4' })
          : add('line', { x1: 0, y1: edge.value, x2: width, y2: edge.value, stroke: color, 'stroke-dasharray': '6 4' }));
        add('text', { x: 12, y: height - 14 - index * 18, fill: color, 'font-size': 14, 'paint-order': 'stroke', stroke: '#000', 'stroke-width': 3 }, `${rule.name}: ${rule.spread <= 1 ? '맞음' : rule.spread + 'px 어긋남'}`);
      });
      document.body.appendChild(svg);
    }, { found, rules, width, height });
    await page.screenshot({ path: `${output}/board-guides-${width}x${height}.png` });
    results.push({ size: `${width}x${height}`, rules: rules.map(rule => ({ name: rule.name, spread: rule.spread })) });
  }
  const off = results.flatMap(result => result.rules.filter(rule => rule.spread > 1).map(rule => `${result.size} ${rule.name} ${rule.spread}px`));
  if (off.length) throw new Error('Board HUD lines are off: ' + off.join(', '));
  return results;
}
