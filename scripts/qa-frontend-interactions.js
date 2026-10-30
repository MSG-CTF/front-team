async (page) => {
  const origin = new URL(page.url()).origin;
  const output = new URL(page.url()).searchParams.get('qaOutput') || 'output/playwright';
  const prefix = new URL(origin).port==='4173'?'regression-baseline':'regression-current';
  const now = '2026-10-20T03:00:00.000Z';
  const iso = delta => new Date(Date.parse(now) + delta).toISOString();
  const clubs = ['MJSEC', 'SWING', 'Y-CERT', 'seKUrity', 'CodeCure', 'Aegis'];
  const challenges = clubs.map((name, i) => ({ koth_challenge_id: `koth-${i + 1}`, title: `QA ${name}`, status: 'ACTIVE', open_group: i + 1, challenge_url: 'https://example.com/', current_score: 50, current_owner_team_name: 'QA Alpha', opened_at: iso(-300000), closed_at: null }));
  const signatures = clubs.map((club_name, i) => ({ signature_id: `signature-${i + 1}`, club_id: `club-${i + 1}`, club_name, title: `QA ${club_name}`, description: '한글과 영문이 함께 표시되는 문제 안내입니다. QA description.', score: 100, is_solved: false, solved_at: null, solved_team_count: 0 }));
  const teams = Array.from({ length: 8 }, (_, i) => ({ team_id: `team-${i + 1}`, team_name: `QA ${['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'][i]}`, team_score: 800 - i * 100, is_top3: i < 3, solves: [{ challenge_id: 'challenge-1', solved_at: iso(-300000), points: 800 - i * 100, source_type: 'JEOPARDY' }] }));
  const cells = Array.from({ length: 36 }, (_, index) => ({ cell_index: index + 1, type: ({1:'START',7:'CHANCE',16:'ROULETTE',21:'AIRPORT',25:'ROULETTE',30:'CHANCE'})[index+1] || 'CHALLENGE', difficulty: 'EASY', name: `QA ${index+1}`, line_number: Math.floor(index / 6) + 1 }));
  const progress = challenges.map((challenge, i) => ({ koth_challenge_id: challenge.koth_challenge_id, earned_score: 50, rank: i + 1, solved_at: iso(-60000) }));
  let flagSubmitted=false;
  const unknown = [];
  const apiRequests = [];
  await page.unroute('**/api/v1/**');
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    apiRequests.push(path);
    const scenario=new URL(route.request().frame().url()).searchParams.get('qaScenario');
    const special={golden:[7,'CHANCE'],roulette:[16,'ROULETTE'],airport:[21,'AIRPORT'],selection:[2,'CHALLENGE']}[scenario]||[1,'START'];
    let data;
    if (path === '/auth/me' && new URL(page.url()).pathname === '/login') {
      await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({code:'TOKEN_INVALID',message:'anonymous local QA',data:null})});
      return;
    }
    if (path === '/auth/me') data = { user_id: 'qa-user', nickname: 'QA 운영자', role: 'ADMIN', is_leader: true, team_id: 'team-1', team_name: 'QA Alpha' };
    else if (path === '/board') data = { total_cell_count: 36, cells };
    else if (path === '/board/me') data = { position: special[0], type: special[1], dice_rolls_left: 3, next_dice_reset_at: iso(600000), cell_states: [], chance_cards: [], consumed_cell_indexes: [], active_challenge: null };
    else if (path === '/board/dice/status') data = { can_roll: true, dice_rolls_left: 3, timer_running: true, blocked_reason: null, server_time: now, next_dice_reset_at: iso(600000) };
    else if (path === '/board/chance/catalog') data = { cards: [] };
    else if (path === '/board/cell/current') data = {cell_index:special[0],type:special[1],challenge_candidates:scenario==='selection'?[1,2,3].map(i=>({challenge_id:`candidate-${i}`,challenge_title:`QA 선택 문제 ${i}`,category:'WEB',club_name:'MJSEC',score:100})):[]};
    else if (path === '/board/opened_challenges') data = {opened_challenges:[{challenge_id:'challenge-1',cell_index:2,title:'QA 첫번째 열린 문제',category:'WEB',club_name:'MJSEC',score:100,is_solved:false,opened_at:iso(-60000)},{challenge_id:'challenge-2',cell_index:3,title:'QA 두번째 열린 문제',category:'PWN',club_name:'SWING',score:200,is_solved:true,opened_at:iso(-60000),solved_at:now}],total_count:2};
    else if (path === '/board/chance/now') data={card_id:'card_reroll',name:'주사위 다시 굴리기',description:'다음 주사위 결과를 다시 굴릴 수 있습니다',usage_timing:'POST_ROLL',dice_rolls_left:3,awaiting_discard:false};
    else if(path==='/board/roulette/spin') data={roulette_result:{label:'150'},mileage_gained:150,total_mileage:1150};
    else if (path === '/timer') data = { name: 'QA MSG CTF', status: 'RUNNING', start_time: iso(-3600000), end_time: iso(3600000), server_time: now, remaining_seconds: 3600 };
    else if (path === '/leaderboard') data = { teams };
    else if (path === '/ranking') data = { rankings: teams.slice(0, 6).map((team,i) => ({...team, rank:i+1, mileage:1000, last_solved_at:iso(-300000)})), total_count: 8 };
    else if (path === '/ranking/me' || path === '/ranking/member') data = { rank:1, nickname:'QA 운영자', user_score:800, solved_count:1 };
    else if (path === '/koth/clubs') data = { clubs: clubs.map((name,i)=>({club_id:`club-${i+1}`, name, challenges:[challenges[i]]})), total_count:6, challenge_count:6, active_count:6 };
    else if (path === '/koth/me') data = { team_name:'QA Alpha', total_koth_score:300, challenges:progress };
    else if (path === '/koth/leaderboard') data = { koth_challenge_id:url.searchParams.get('koth_challenge_id'), leaderboard:[{rank:1,team_id:'team-1',team_name:'QA Alpha',earned_score:50}] };
    else if (path.startsWith('/koth/clubs/')) { const index = Number(path.split('-').at(-1))-1; data = {club_id:`club-${index+1}`,name:clubs[index],challenge_count:1,challenges:[challenges[index]]}; }
    else if (path === '/koth/team_token') data = { team_token:'qa-local-fixture-token' };
    else if (path === '/signatures') data = {signatures, total_count:signatures.length};
    else if (path.startsWith('/signatures/')) data = signatures.find(item => path.endsWith(item.signature_id));
    else if (path === '/teams/me') data = {team_name:'QA Alpha',team_score:800,mileage:1000,jeopardy_score:500,koth_score:300,signature_score:0,is_banned:false,members:[{nickname:'QA 운영자',is_leader:true},{nickname:'QA 참가자',is_leader:false}]};
    else if (path === '/teams/me/mileage_history') data = {history:[],total_count:0};
    else if (path === '/teams/me/solves') data = {solves:[],total_count:0};
    else if(path==='/teams/me/qr_token') data={payment_token:'local-qa-payment-token',expires_at:iso(120000)};
    else if(path==='/challenges/challenge-1/submit'){flagSubmitted=true;data={is_correct:true,earned_score:100,mileage_gained:100};}
    else if (path === '/instances/me' || path === '/teams/me/instances') data=scenario==='instance'?{instance_id:'qa-instance',challenge_id:'challenge-1',status:'RUNNING',expires_at:iso(1800000),extend_count:0,endpoints:[{container_name:'web',port:80,service_url:'https://challenge.example.com/long-connection-address-for-mobile-layout'}]}:null;
    else if (path.startsWith('/challenges/')) data = {challenge_id:'challenge-1',title:'QA Challenge',description:'한글 문제 설명과 English description',category:'WEB',score:100,status:'OPENED',opened_at:iso(-60000),is_solved:flagSubmitted,files:[],instance_required:false};
    else if (path === '/admin/dashboard') data = {total_teams:8,total_users:16,running_instances:0,failed_instances:0,total_challenges:36};
    else if (path === '/admin/events') data = {events:[],total_count:0};
    else if (path === '/admin/instances') data = {instances:[],total_count:0,summary:{by_status:{RUNNING:0,FAILED:0}}};
    else if (path === '/admin/resources') data = {resources:[]};
    else if (path === '/admin/teams') data = {teams:teams,total_count:8};
    else {unknown.push(path);data={};}
    await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({code:'SUCCESS',message:'로컬 QA fixture',data}) });
  });
  await page.addInitScript(() => {
    Math.random=()=>0.25;
    if (location.pathname === '/login') localStorage.removeItem('msgctf_access_token');
    else localStorage.setItem('msgctf_access_token', 'local-qa-token');
    const OriginalDate = Date;
    const fixed = OriginalDate.parse('2026-10-20T03:00:00.000Z');
    window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
  });
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  await page.emulateMedia({reducedMotion:'reduce'});
  const results = [];
  const settle = async () => {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => Promise.all([...document.images].filter(image => {
      const box=image.getBoundingClientRect();return box.bottom>0 && box.top<innerHeight;
    }).map(image=>image.decode().catch(()=>{}))));
    await page.waitForTimeout(200);
  };
  const capture = async (name, width, fullPage = false) => {
    await settle();
    await page.screenshot({path:`${output}/${prefix}-${name}-${width}.png`,fullPage,animations:'disabled',mask:[page.locator('iframe')]});
    const record = await page.evaluate(() => {
      const visible = element => {
        const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
        return rect.width>0 && rect.height>0 && style.display!=='none' && style.visibility!=='hidden';
      };
      const content=[...document.querySelectorAll('h1,h2,h3,p,button,a,label,select,input,[role="dialog"],[role="region"],[data-board-layer]')].filter(visible);
      return {
        text:document.body.innerText.replace(/\s+/g,' ').trim(),
        nodes:content.map(element=>{
          const r=element.getBoundingClientRect();
          return {tag:element.tagName,role:element.getAttribute('role'),label:element.getAttribute('aria-label')||'',text:(element.textContent||'').replace(/\s+/g,' ').trim(),rect:[r.x,r.y,r.width,r.height].map(value=>Math.round(value*100)/100)};
        }),
        overflow:document.documentElement.scrollWidth>innerWidth,
        broken:[...document.images].filter(image=>image.complete && image.naturalWidth===0).map(image=>image.src),
        alerts:[...document.querySelectorAll('[role="alert"]')].filter(visible).map(element=>element.textContent),
        bodyLocked:document.body.style.overflow==='hidden',
        focusInsideDialog:!document.querySelector('[role="dialog"]') || Boolean(document.activeElement.closest('[role="dialog"]')),
        leaderboardFullImage:performance.getEntriesByType('resource').some(entry=>entry.name.endsWith('/leaderboard/leaderboard.png')),
      };
    });
    if(record.overflow || record.broken.length || record.alerts.length) throw new Error(JSON.stringify({name,width,...record}));
    results.push({name,width,...record});
  };
  const navigate = async path => {
    await page.goto(origin+path);
    await page.locator('main, [data-board-layer="track"], form').first().waitFor();
    await settle();
  };
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:width===1440?900:844});
    for (const path of ['/','/guide']) {
      await navigate(path);
      for (let y=0;y<await page.evaluate(()=>document.documentElement.scrollHeight);y+=650) {
        await page.evaluate(y=>scrollTo(0,y),y);
        await page.waitForTimeout(60);
      }
      await page.evaluate(()=>scrollTo(0,0));
      await capture(path==='/'?'intro-full':'guide-full',width,true);
    }
    await navigate('/board');
    await page.getByRole('button',{name:/^열린 문제 목록 보기/}).click();
    await page.getByRole('searchbox').waitFor();
    await capture('board-list',width);
    await page.getByRole('searchbox').fill('첫번째');
    if(await page.getByText('QA 두번째 열린 문제',{exact:true}).isVisible()) throw new Error('Board search did not filter results');
    await page.keyboard.press('Escape');
    await navigate('/board');
    if(width<1101) {
      await page.getByRole('button',{name:'보드 확대 보기',exact:true}).click();
      await capture('board-zoom',width);
      await page.getByRole('button',{name:'보드 전체 보기',exact:true}).click();
    }
    await navigate('/board?qaScenario=golden');
    await page.getByRole('dialog',{name:'주사위 다시 굴리기',exact:true}).waitFor();
    await capture('golden-key',width);
    await page.keyboard.press('Tab');
    if(!await page.getByRole('dialog').evaluate(element=>element.contains(document.activeElement))) throw new Error('Golden key focus escaped');
    await page.keyboard.press('Escape');
    if(await page.getByRole('dialog').count()) throw new Error('Golden key did not close');
    await navigate('/board?qaScenario=roulette');
    await page.getByRole('dialog',{name:'MILEAGE ROULETTE',exact:true}).waitFor();
    await capture('roulette-ready',width);
    await page.getByRole('button',{name:'룰렛 돌리기(SPIN)',exact:true}).click();
    await page.getByText('+150 M',{exact:true}).waitFor();
    await capture('roulette-result',width);
    await page.getByRole('button',{name:'확인',exact:true}).click();
    if(await page.getByRole('dialog').count()) throw new Error('Roulette did not close');
    await navigate('/board?qaScenario=airport');
    await page.getByRole('button',{name:/^2번 QA 2 칸/}).click();
    await page.getByRole('region',{name:'기차여행 목적지 확인',exact:true}).waitFor();
    await capture('airport-confirm',width);
    await page.getByRole('button',{name:'다시 고르기',exact:true}).click();
    if(await page.getByRole('region',{name:'기차여행 목적지 확인',exact:true}).count()) throw new Error('Airport selection did not reset');
    await navigate('/board?qaScenario=selection');
    await page.getByRole('dialog',{name:'도전할 문제를 선택하세요',exact:true}).waitFor();
    await capture('challenge-selection',width);
    await page.keyboard.press('Escape');
    if(await page.getByRole('dialog').count()) throw new Error('Challenge selection did not close');
    await navigate('/signatures/clubs/club-1');
    await page.getByRole('dialog',{name:'MJSEC',exact:true}).waitFor();
    await page.getByRole('heading',{name:'QA MJSEC',exact:true}).waitFor();
    await capture('booth-menu',width);
    await page.keyboard.press('Escape');
    await page.waitForURL('**/signatures');
    await page.waitForFunction(()=>document.body.style.overflow!=='hidden' && !document.querySelector('[role=\"dialog\"]'),null,{polling:100,timeout:10000});
    for (const [path,name] of [['/mypage','mypage'],['/challenges/challenge-1','challenge-detail'],['/rules','rules'],['/admin','admin-dashboard']]) {
      await navigate(path);
      await capture(name,width);
    }
    await navigate('/mypage');
    await page.getByRole('button',{name:'결제 QR 발급',exact:true}).click();
    await page.locator('[aria-label^="결제 QR 코드,"] svg').waitFor();
    await capture('mypage-qr',width);
    await navigate('/challenges/challenge-1');
    await page.getByRole('textbox',{name:'플래그',exact:true}).fill('msgctf2026{local_qa}');
    await capture('flag-input',width);
    await page.getByRole('button',{name:'플래그 제출',exact:true}).click();
    await page.getByRole('button',{name:'플래그 제출',exact:true}).filter({hasText:'SOLVED'}).waitFor();
    await capture('flag-submitted',width);
    flagSubmitted=false;
    await navigate('/challenges/challenge-1?qaScenario=instance');
    await page.getByRole('button',{name:'인스턴스 종료',exact:true}).click();
    const confirmation=page.getByRole('dialog',{name:'인스턴스 종료',exact:true});
    await confirmation.waitFor();
    const dialogBox=await confirmation.boundingBox();
    if(dialogBox.x<0 || dialogBox.x+dialogBox.width>width+1) throw new Error('Instance confirmation does not fit viewport');
    await capture('instance-confirmation',width);
    await page.keyboard.press('Escape');
    await navigate('/koth');
    await page.getByRole('button',{name:/^MJSEC .* KoTH/}).click();
    await page.getByRole('link',{name:'문제 접속',exact:true}).waitFor();
    await capture('koth-detail',width);
    await page.getByRole('button',{name:'선택한 문제 정보 닫기',exact:true}).click();
    await page.getByRole('button',{name:'팀 토큰',exact:true}).click();
    const token=page.getByRole('dialog',{name:'KOTH TEAM TOKEN',exact:true});
    await page.locator('#koth-team-token').waitFor();
    const tokenBox=await token.boundingBox();
    if(tokenBox.x<0 || tokenBox.x+tokenBox.width>width+1) throw new Error('Team token does not fit viewport');
    await capture('koth-token',width);
    await page.keyboard.press('Escape');
    await navigate('/leaderboard');
    await page.locator('main[data-leaderboard-source*="leaderboard:success"]').waitFor();
    await capture('leaderboard-symbols',width);
    const graph=page.locator('[data-range-start]');
    const initial=await graph.getAttribute('data-range-start');
    await page.getByRole('button',{name:'시간 구간 확대',exact:true}).click();
    if(await graph.getAttribute('data-range-start')===initial) throw new Error('Graph zoom did not change time range');
    await capture('leaderboard-graph-zoom',width);
    await page.getByRole('button',{name:'전체 보기',exact:true}).click();
    if(await graph.getAttribute('data-range-start')!==await graph.getAttribute('data-full-start')) throw new Error('Graph zoom did not reset');
    if(width<1101) {
      const table=page.getByRole('region',{name:'팀 순위표',exact:true});
      await table.scrollIntoViewIfNeeded();
      await table.evaluate(node=>{node.scrollLeft=node.scrollWidth;});
      if(await table.evaluate(node=>node.scrollLeft)<100) throw new Error('All fourteen columns cannot be reached');
      await capture('leaderboard-table-scroll',width);
    }
  }
  page.removeListener('pageerror',onError);
  if(errors.length || unknown.length) throw new Error(JSON.stringify({errors,unknown}));
  return {prefix,results,errors,unknown:[...new Set(unknown)]};
}
