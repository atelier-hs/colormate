// 언어 선택 익명 집계 — Vercel 서버 함수
// POST /api/lang  { lang: "en", at: "2026-10-08T05:00:00Z", page: "index.html" }
// 개인 식별 정보(IP, 기기 정보)는 저장하지 않고 언어 코드와 시각만 남긴다.
// 지금은 서버 로그에 남기며, 운영 단계에서는 Vercel KV·Supabase 등 저장소에 시간대별로 누적해
// 운영자 대시보드의 "언어별 이용"과 외국인 방문 추정에 쓴다.

const LANGS = ['ko', 'en', 'ja', 'zh'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).end(); return; }
  let body = req.body;
  try { if (typeof body === 'string') body = JSON.parse(body); } catch (e) { body = {}; }
  const lang = body && LANGS.includes(body.lang) ? body.lang : null;
  if (!lang) { res.status(400).end(); return; }
  const hour = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 13); // KST 기준 시간 단위로만 기록
  console.log(JSON.stringify({ type: 'lang_pick', lang, hour, page: String(body.page || '').slice(0, 40) }));
  res.status(204).end();
};
