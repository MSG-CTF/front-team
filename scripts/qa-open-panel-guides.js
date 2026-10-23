// Run with playwright-cli run-code --filename on an authenticated /challenges page (local fixtures or a real session).
// This script only reads the UI. It opens both tabs of the open challenges panel and checks four vertical lines:
// L0 left edge (tabs, search row, status filter, number seals, group rule, line summary), R0 right edge (tabs,
// search row, chevrons, line progress), L1 text column (titles, categories, line names, line cells) and C0 icon
// column (seal centers in both tabs). L1 and C0 must also stay in the same place when the tab changes.
// qaOutput selects the screenshot folder; qaSizes defaults to 1920x1080,1366x768,1101x700,2560x1440.
async page => {
  const url = new URL(page.url());
  const output = url.searchParams.get('qaOutput') || 'output/playwright/open-panel-guides';
  const sizes = (url.searchParams.get('qaSizes') || '1920x1080,1366x768,1101x700,2560x1440').split(',').map(size => size.split('x').map(Number));
  const measure = () => {
    const panel = document.getElementById('board-open-challenges-panel');
    const all = css => [...panel.querySelectorAll(css)].filter(node => node.getClientRects().length);
    const box = node => node.getBoundingClientRect();
    const round = value => Math.round(value * 10) / 10;
    const edges = { L0: [], R0: [], L1: [], C0: [] };
    const add = (key, name, value) => edges[key].push({ name, value: round(value) });
    const tabs = all("[role='tablist']")[0];
    if (tabs) { add('L0', '탭', box(tabs).left); add('R0', '탭', box(tabs).right); }
    if (!all('#board-line-progress').length) {
      const search = all("[class*='_openSearchRow_']")[0];
      if (search) { add('L0', '검색 줄', box(search).left); add('R0', '검색 줄', box(search).right); }
      const status = all("[class*='_openStatusTabs_'] button")[0];
      if (status) add('L0', '풀이 상태', box(status).left);
      all("[class*='_openRow_']").slice(0, 4).forEach((row, index) => {
        const badge = row.querySelector("[class*='_openRowNo_']");
        // 푼 문제 도장은 기울어 있어 상자 대신 가운데로 잰다
        if (!row.closest("li[data-solved='true']")) add('L0', `배지${index + 1}`, box(badge).left);
        add('C0', `배지${index + 1} 가운데`, box(badge).left + box(badge).width / 2);
        add('L1', `제목${index + 1}`, box(row.querySelector('strong')).left);
        add('L1', `분야${index + 1}`, box(row.querySelector("[class*='_openRowMeta_']")).left);
        add('R0', `화살표${index + 1}`, box(row.querySelector("[class*='_openRowChevron_']")).right);
      });
      const group = all("[class*='_openGroupLabel_']")[0];
      if (group) { add('L0', '완료 구분선', box(group).left); add('R0', '완료 구분선', box(group).right); }
    } else {
      const stats = all("[class*='_lineStats_']")[0];
      if (stats) { add('L0', '요약', box(stats).left); add('R0', '요약', box(stats).right); }
      all('[data-line-row]').slice(0, 3).forEach((row, index) => {
        const seal = row.querySelector("[class*='_lineSeal_']");
        add('L0', `라인 도장${index + 1}`, box(seal).left);
        add('C0', `라인 도장${index + 1} 가운데`, box(seal).left + box(seal).width / 2);
        add('L1', `라인 이름${index + 1}`, box(row.querySelector("[class*='_lineName_']")).left);
        add('L1', `대상 칸${index + 1}`, box(row.querySelector("[class*='_lineCells_']")).left);
        add('R0', `진행${index + 1}`, box(row.querySelector("[class*='_lineBadge_']")).right);
      });
    }
    return edges;
  };
  const draw = edges => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    Object.assign(svg.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '2147483647', pointerEvents: 'none' });
    const colors = { L0: '#00b3ff', R0: '#ff3bd4', L1: '#2ee86b', C0: '#ffb000' };
    Object.entries(edges).forEach(([key, list]) => [...new Set(list.map(item => item.value))].forEach(value => {
      const line = document.createElementNS(ns, 'line');
      Object.entries({ x1: value, x2: value, y1: 0, y2: innerHeight, stroke: colors[key], 'stroke-dasharray': '4 3' }).forEach(([name, attr]) => line.setAttribute(name, attr));
      svg.appendChild(line);
    }));
    document.body.appendChild(svg);
  };
  const results = [];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    const columns = {};
    for (const tab of ['problems', 'lines']) {
      await page.goto(url.origin + '/challenges' + url.search, { waitUntil: 'load' });
      const panel = page.locator('#board-open-challenges-panel');
      await panel.waitFor({ timeout: 20000 });
      await page.evaluate(() => document.fonts.ready);
      if (tab === 'lines') await panel.locator("[role='tab']", { hasText: '라인' }).click();
      await page.mouse.move(0, 0);
      await page.waitForTimeout(800);
      const edges = await page.evaluate(measure);
      await page.evaluate(draw, edges);
      await page.screenshot({ path: `${output}/open-panel-${tab}-${width}x${height}.png` });
      columns[tab] = { L1: edges.L1[0]?.value, C0: edges.C0[0]?.value };
      Object.entries(edges).forEach(([key, list]) => {
        const values = list.map(item => item.value);
        results.push({ size: `${width}x${height}`, tab, line: key, spread: values.length ? Math.round((Math.max(...values) - Math.min(...values)) * 10) / 10 : 0 });
      });
    }
    for (const key of ['L1', 'C0']) results.push({ size: `${width}x${height}`, tab: '탭 사이', line: key, spread: Math.round(Math.abs(columns.problems[key] - columns.lines[key]) * 10) / 10 });
  }
  const off = results.filter(result => result.spread > 1).map(result => `${result.size} ${result.tab} ${result.line} ${result.spread}px`);
  if (off.length) throw new Error('Open panel lines are off: ' + off.join(', '));
  return results;
}
