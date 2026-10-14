// 서울 실시간 도시데이터(인구) 프록시 — Vercel 서버 함수
// GET /api/citydata?area=성수카페거리
// 브라우저가 서울시 API(http, 인증키 필요)를 직접 부르지 않도록 서버에서 대신 호출하고,
// 화면에 필요한 값만 정리해서 돌려준다. 인증키는 환경변수 SEOUL_API_KEY에 둔다.

const ALLOWED = ['성수카페거리', '서울숲공원']; // 열린데이터광장 '주요 121장소 목록'의 이름과 같아야 함

module.exports = async (req, res) => {
  const area = String((req.query && req.query.area) || '');
  if (!ALLOWED.includes(area)) {
    res.status(400).json({ error: '지원하지 않는 장소입니다.', allowed: ALLOWED });
    return;
  }
  const key = process.env.SEOUL_API_KEY;
  if (!key) {
    res.status(503).json({ error: 'SEOUL_API_KEY 환경변수가 없습니다.' });
    return;
  }

  const url = `http://openapi.seoul.go.kr:8088/${key}/json/citydata_ppltn/1/5/${encodeURIComponent(area)}`;
  try {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    const payload = await r.json();
    // 응답 최상위 키 이름이 바뀌어도 동작하도록 citydata_ppltn 목록을 찾는다
    const list = Object.entries(payload).find(([k, v]) => k.includes('citydata_ppltn') && Array.isArray(v));
    const item = list && list[1][0];
    if (!item) {
      res.status(502).json({ error: '서울시 API 응답에 데이터가 없습니다.', result: payload.RESULT || null });
      return;
    }
    const num = v => Number(v) || 0;
    const body = {
      area: item.AREA_NM,
      time: item.PPLTN_TIME,                // 예: "2026-10-08 14:00"
      level: item.AREA_CONGEST_LVL,         // 여유 | 보통 | 약간 붐빔 | 붐빔
      message: item.AREA_CONGEST_MSG,
      min: num(item.AREA_PPLTN_MIN),
      max: num(item.AREA_PPLTN_MAX),
      nonResidentRate: num(item.NON_RESNT_PPLTN_RATE),
      forecast: (item.FCST_PPLTN || []).map(f => ({
        time: f.FCST_TIME,
        level: f.FCST_CONGEST_LVL,
        min: num(f.FCST_PPLTN_MIN),
        max: num(f.FCST_PPLTN_MAX)
      }))
    };
    // 실시간 인구는 5분마다 갱신되므로 5분 동안 캐시
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json(body);
  } catch (e) {
    res.status(502).json({ error: '서울시 API 호출에 실패했습니다.', detail: String(e && e.message || e) });
  }
};
