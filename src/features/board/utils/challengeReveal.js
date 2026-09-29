export const CHALLENGE_REVEAL_DURATION = 800;

// 요청과 동시에 시작해 빠른 응답에서는 연출을 남기고, 느린 응답에는 시간을 더하지 않는다
export function createChallengeReveal(skipMotion = false) {
  let cancelled = false;
  let finish;
  let timer;
  const ready = new Promise(resolve => {
    finish = resolve;
    if (skipMotion) resolve();
    else timer = setTimeout(resolve, CHALLENGE_REVEAL_DURATION);
  });
  return {
    async wait() { await ready; return !cancelled; },
    cancel() { cancelled = true; clearTimeout(timer); finish(); },
  };
}

export async function openChallengeWithReveal({ request, beforeNavigate, navigate }) {
  const openedChallenge = await request();
  if (!openedChallenge) return;
  if (beforeNavigate && !await beforeNavigate()) return;
  navigate(openedChallenge);
}
