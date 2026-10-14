// AI 가이드 LLM 프록시 — Vercel 서버 함수
// POST /api/chat  { lang: "ko", messages: [{ role, content }, ...] }  →  { text }
// Claude API(Messages API)를 호출한다. 키는 환경변수 ANTHROPIC_API_KEY, 모델은 CLAUDE_MODEL로 바꿀 수 있다.
// 키가 없으면 503을 돌려주고, 화면(guide.js)은 내장 안내 지식으로 답한다.

// 축제 안내 지식. 실제 운영에서는 프로그램 주관사가 등록한 문서를 검색(RAG)해서 넣는다.
const KNOWLEDGE = `
[축제] 2026 크리에이티브X성수, 2026-10-05(월) ~ 10-11(일), 서울 성동구 성수동 일대. 주최 성동문화재단.
[컬러 어드벤처] 플레이X성수 2026 프로그램. 주관 유니크굿컴퍼니.
- 하는 일: 성수동 5개 스팟을 돌며 퍼즐을 풀고 컬러를 모은다. 다섯 색을 모아 메인 미션을 클리어하면 히든 미션이 열린다.
- 진행: 결제 → 카카오톡 또는 이메일로 시크릿 코드 수신 → 게임 사이트 접속 → 리얼월드 성수 1층에서 키트 수령 → 게임 진행. 앱 설치·회원가입 없음.
- 시간: 키트 수령 11:00~17:00, 플레이는 18:00까지 종료.
- 비용: 현장 결제 1인 20,000원. 메인 미션 완료 시 당일 테이크아웃 음료 1잔.
[주제전시 & 퍼포먼스] 에스팩토리, 10-08 ~ 10-11, 무료.
[서밋] 에스팩토리 D동, 10-08 ~ 10-11, 무료.
[뮤직성수·패션성수] 성수이로 일대, 10-10 ~ 10-11 주말.
`;

const SYSTEM = `너는 2026 크리에이티브X성수 축제의 안내 도우미 "컬러메이트"다.
규칙:
- 아래 안내 지식에 있는 내용만 사실로 말한다. 없는 내용은 모른다고 말하고 "운영팀에 전달하겠다"고 안내한다.
- 퍼즐의 정답과 미션 스팟의 정확한 위치는 절대 알려주지 않는다. 대신 무엇을 푸는 문제인지, 풀이 방향을 단계적으로 안내한다.
- 사용자가 쓴 언어(또는 지정된 언어)로 3~5문장 이내로 짧게 답한다.
안내 지식:
${KNOWLEDGE}`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(503).json({ error: 'ANTHROPIC_API_KEY 환경변수가 없습니다.' }); return; }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const lang = ['ko', 'en', 'ja', 'zh'].includes(body.lang) ? body.lang : 'ko';
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content.slice(0, 1000) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    res.status(400).json({ error: '마지막 메시지는 사용자 질문이어야 합니다.' });
    return;
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
        max_tokens: 400,
        system: `${SYSTEM}\n답변 언어 코드: ${lang}`,
        messages
      })
    });
    const data = await r.json();
    if (!r.ok) { res.status(502).json({ error: 'LLM 호출 실패', detail: data && data.error }); return; }
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    res.status(200).json({ text });
  } catch (e) {
    res.status(502).json({ error: 'LLM 호출 실패', detail: String(e && e.message || e) });
  }
};
