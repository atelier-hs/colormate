/* AI 가이드
   1순위: /api/chat (LLM, 축제 안내 지식을 시스템 프롬프트로 전달)
   2순위: 서버가 없거나 실패하면 아래 안내 지식(KB)에서 키워드로 답변 */
(function () {
  'use strict';
  const chat = document.getElementById('chat');
  const suggest = document.getElementById('suggest');
  const form = document.getElementById('composer');
  const input = document.getElementById('ask');
  const history = [];
  const SRC_PLAY = { ko: '출처: 플레이X성수 예매 페이지', en: 'Source: PlayXSeongsu booking page', ja: '出典：PlayXSeongsu予約ページ', zh: '来源：PlayXSeongsu预订页面' };

  const TEXT = {
    ko: { greet: '안녕하세요! 참여 방법, 장소, 시간, 막힌 미션까지 물어보세요. 게임은 기존 사이트에서, 저는 옆에서 도와드려요.',
          chips: ['결제 전에 뭐 하는지 알 수 있어요?', '키트는 어디서 받아요?', '1번 스팟 퍼즐, 뭘 풀라는 거예요?', '지금 덜 붐비는 곳은?'],
          fallback: '이 질문은 운영팀 대시보드에 "미해결 질문"으로 전달했어요. 직원이 확인하면 여기서 답을 드릴게요.',
          steps: ['1 무엇을 푸나', '2 방향', '3 단서'] },
    en: { greet: 'Hi! Ask me how to join, where to go, opening hours or a mission you are stuck on. You play on the game site; I help on the side.',
          chips: ['What do I do before paying?', 'Where do I get the kit?', 'What is the spot 1 puzzle asking?', 'Where is less crowded now?'],
          fallback: 'I passed this question to the festival team as an open question. You will get an answer here once staff check it.',
          steps: ['1 What to solve', '2 Direction', '3 Key clue'] },
    ja: { greet: 'こんにちは！参加方法、場所、時間、詰まったミッションまで何でも聞いてください。',
          chips: ['支払い前に何をするか分かりますか？', 'キットはどこで受け取りますか？', '今空いている場所は？'],
          fallback: 'この質問は運営チームに送りました。スタッフが確認したらここでお答えします。',
          steps: ['1 何を解く', '2 方向', '3 ヒント'] },
    zh: { greet: '你好！参与方法、地点、时间、卡住的任务都可以问我。',
          chips: ['付款前能知道要做什么吗？', '在哪里领取套件？', '现在哪里人少？'],
          fallback: '这个问题已转交运营团队，工作人员确认后会在这里回复。',
          steps: ['1 解什么', '2 方向', '3 线索'] }
  };

  /* 안내 지식: 정답·장소는 비공개, "무엇을 어떻게 하는지"는 공개 */
  const KB = [
    { id: 'preview', k: ['결제', '전에', '미리', '비밀', '뭐 하', 'before', 'paying', 'what do', '支払', '付款'],
      a: { ko: '정답과 장소는 비밀이지만, 무엇을 하는지는 알려드릴게요.\n· 성수 곳곳 5개 스팟에서 퍼즐 풀기\n· 다섯 색을 모으면 히든 미션 오픈\n· 결제 → 시크릿 코드 → 앱 접속 → 리얼월드에서 키트 수령 → 게임 진행',
           en: 'The answers and spots stay secret, but here is what you do.\n· Solve puzzles at 5 spots around Seongsu\n· Collect all five colors to open the hidden mission\n· Pay → secret code → open the game site → pick up the kit at Realworld → play',
           ja: '答えと場所は秘密ですが、内容はお伝えします。\n・聖水の5つのスポットでパズルを解く\n・5色を集めるとヒドゥンミッションが開く\n・支払い → シークレットコード → ゲームサイト接続 → キット受け取り → プレイ',
           zh: '答案和地点保密，但可以告诉你要做什么。\n・在圣水5个地点解谜\n・集齐5种颜色开启隐藏任务\n・付款 → 秘密代码 → 打开游戏网站 → 领取套件 → 开始' }, src: true },
    { id: 'kit', k: ['키트', '수령', '어디서', 'kit', 'pick', 'キット', '套件'],
      a: { ko: '키트는 리얼월드 성수 1층에서 11시부터 17시까지 받을 수 있어요. 시크릿 코드 화면을 보여주세요. 플레이는 18시까지예요.',
           en: 'Pick up your kit on the 1st floor of Realworld Seongsu between 11:00 and 17:00. Show your secret code screen. Play ends at 18:00.',
           ja: 'キットはリアルワールド聖水1階で11時から17時まで受け取れます。プレイは18時までです。',
           zh: '套件在Realworld圣水1楼领取，时间为11:00–17:00。游戏到18:00结束。' }, src: true },
    { id: 'fee', k: ['비용', '가격', '참가비', '얼마', 'fee', 'price', 'cost', '料金', '费用'],
      a: { ko: '참가비는 1인 2만 원이고 현장에서 결제해요. 메인 미션을 마치면 당일 쓸 수 있는 테이크아웃 음료 1잔을 받아요.',
           en: 'It is 20,000 KRW per person, paid on site. Finish the main mission to get one takeout drink for the day.',
           ja: '参加費は1人2万ウォンで、現地で支払います。', zh: '每人2万韩元，现场付款。' }, src: true },
    { id: 'puzzle', k: ['퍼즐', '풀', '문제', '미션', '스팟', 'puzzle', 'mission', 'spot', 'solve', 'パズル', '谜'],
      a: { ko: '정답 대신 단계별로 도와드릴게요. 막힌 만큼만 열어보세요.',
           en: 'I will help step by step instead of giving the answer. Open only as much as you need.',
           ja: '答えの代わりに段階的にお手伝いします。', zh: '我会一步步帮你，而不是直接给答案。' }, steps: true },
    { id: 'crowd', k: ['붐비', '혼잡', '덜', '사람', 'crowd', 'busy', 'less', '混雑', '空い', '拥挤', '人少'], crowd: true },
    { id: 'staff', k: ['직원', '문의', '전화', 'staff', 'contact', 'スタッフ', '工作人员'],
      a: { ko: '현장 직원도 같은 가이드를 써서 어느 직원에게 물어도 같은 답을 받을 수 있어요. 해결이 안 되면 운영팀에 넘겨드릴게요.',
           en: 'Staff use this same guide, so any staff member can give you the same answer. If it is still unclear, I will pass it to the team.',
           ja: 'スタッフも同じガイドを使っています。', zh: '工作人员也使用同一个导览。' } },
    { id: 'program', k: ['프로그램', '전시', '근처', '다른', 'program', 'exhibition', 'nearby', '展示', '展览'],
      a: { ko: '10월 8일부터 11일까지 에스팩토리에서 주제전시와 서밋이 무료로 열려요. 위치와 혼잡도는 혼잡 지도에서 볼 수 있어요.',
           en: 'From Oct 8 to 11, the main exhibition and the summit run free at S-Factory. See locations and crowds on the crowd map.',
           ja: '10月8日〜11日、エスファクトリーで展示とサミットが無料開催されます。', zh: '10月8日至11日，S-Factory免费举办主题展览和峰会。' } }
  ];

  /* 미션별 단계 힌트: 실제 운영 시 게임 운영사가 등록. 여기 문구는 예시 */
  const HINTS = {
    ko: ['1단계 · 무엇을 푸나: 화면의 그림이 가리키는 글자를 찾아 순서대로 읽는 문제예요. 답은 영어 5글자예요.',
         '2단계 · 방향: 스팟 주변 간판과 벽에서 그림과 같은 색이나 모양을 찾아보세요.',
         '3단계 · 단서: 이 스팟 건물의 재료를 영어로 떠올려 보세요. (예시 힌트)'],
    en: ['Step 1 · What to solve: read the letters the picture points to, in order. The answer is 5 English letters.',
         'Step 2 · Direction: look for the same color or shape on signs and walls around the spot.',
         'Step 3 · Key clue: think of the building material of this spot in English. (sample hint)']
  };

  const lang = () => CM.getLang();
  const pick = obj => obj[lang()] || obj.en || obj.ko;

  function add(who, text, extra) {
    const b = document.createElement('div');
    b.className = 'bubble ' + who;
    b.textContent = text;
    if (extra && extra.src) {
      const s = document.createElement('span');
      s.className = 'src';
      s.textContent = extra.src;
      b.appendChild(s);
    }
    if (extra && extra.steps) b.appendChild(stepButtons());
    chat.appendChild(b);
    chat.scrollTop = chat.scrollHeight;
    return b;
  }

  function stepButtons() {
    const wrap = document.createElement('div');
    wrap.className = 'steps';
    const labels = pick(TEXT).steps;
    const hints = HINTS[lang()] || HINTS.en;
    labels.forEach((label, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => {
        if (btn.getAttribute('aria-pressed') === 'true') return;
        btn.setAttribute('aria-pressed', 'true');
        add('bot', hints[i]);
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  async function crowdAnswer() {
    const areas = [...new Set(CM.PLACES.map(p => p.area))];
    const results = await Promise.all(areas.map(a => CM.getCrowd(a)));
    const order = ['여유', '보통', '약간 붐빔', '붐빔'];
    const rows = areas.map((a, i) => ({ area: a, d: results[i] })).sort((x, y) => order.indexOf(x.d.level) - order.indexOf(y.d.level));
    const live = rows.every(r => r.d.live);
    const lines = rows.map(r => `· ${r.area}: ${CM.levelText(r.d.level)}`).join('\n');
    const head = { ko: '지금 혼잡도예요.', en: 'Crowd levels right now.', ja: '現在の混雑度です。', zh: '当前拥挤度。' };
    const tail = { ko: `\n${rows[0].area} 쪽부터 가면 덜 기다려요.`, en: `\nStart with ${rows[0].area} to wait less.`, ja: `\n${rows[0].area}から回ると待ち時間が短いです。`, zh: `\n先去${rows[0].area}可以少排队。` };
    const src = live ? CM.t('source') : CM.t('source') + CM.t('source_sample');
    add('bot', pick(head) + '\n' + lines + pick(tail), { src });
  }

  function localAnswer(q) {
    const low = q.toLowerCase();
    let best = null, score = 0;
    KB.forEach(item => {
      const s = item.k.filter(k => low.includes(k.toLowerCase())).length;
      if (s > score) { score = s; best = item; }
    });
    return best;
  }

  /* LLM 서버 함수 호출. 키가 없거나 실패하면 null */
  async function askLLM(q) {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lang: lang(), messages: history.concat([{ role: 'user', content: q }]).slice(-10) })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.text ? data.text : null;
    } catch (e) { return null; }
  }

  async function ask(q) {
    q = (q || '').trim();
    if (!q) return;
    add('me', q);
    const item = localAnswer(q);
    // 혼잡·힌트 질문은 실시간 데이터와 단계 버튼이 필요해서 화면에서 직접 처리
    if (item && item.crowd) { await crowdAnswer(); history.push({ role: 'user', content: q }); return; }
    if (item && item.steps) { add('bot', pick(item.a), { steps: true }); history.push({ role: 'user', content: q }); return; }
    const typing = add('bot typing', '…');
    const llm = await askLLM(q);
    typing.remove();
    if (llm) {
      add('bot', llm);
    } else if (item) {
      add('bot', pick(item.a), item.src ? { src: pick(SRC_PLAY) } : null);
    } else {
      add('bot', pick(TEXT).fallback);
    }
    history.push({ role: 'user', content: q }, { role: 'assistant', content: llm || (item ? pick(item.a) : pick(TEXT).fallback) });
  }

  function renderStart() {
    chat.innerHTML = '';
    history.length = 0;
    add('bot', pick(TEXT).greet);
    suggest.innerHTML = '';
    pick(TEXT).chips.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c;
      b.addEventListener('click', () => ask(c));
      suggest.appendChild(b);
    });
  }

  form.addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; ask(v); });
  document.addEventListener('cm:lang', renderStart);
  document.addEventListener('DOMContentLoaded', renderStart);
})();
