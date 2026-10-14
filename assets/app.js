/* 성수 컬러메이트 공통 스크립트
   - 언어 선택 저장(모든 화면 공유)과 화면 문구 번역
   - 축제 장소 설정
   - 서울 실시간 도시데이터 조회 (/api/citydata 프록시 경유, 실패 시 예시값) */
(function () {
  'use strict';

  /* ---------- 언어 ---------- */
  const LANGS = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文' };
  const I18N = {
    ko: { nav_guide: 'AI 가이드', nav_home: '홈', nav_map: '혼잡 지도', ask_guide: 'AI 가이드에게 묻기',
          privacy: '선택한 언어는 익명으로 집계되어 외국인 방문 규모 추정에만 쓰입니다.',
          crowd_now: 'Crowd now', live: '실시간', sample: '예시값', now: '지금', forecast: '예측',
          tip_head: '덜 붐비는 순서', source: '혼잡도: 서울 실시간 도시데이터', source_sample: ' · 연결 전이라 예시값 표시',
          ask: '무엇이든 물어보세요', send: '보내기' },
    en: { nav_guide: 'AI Guide', nav_home: 'Home', nav_map: 'Crowd map', ask_guide: 'Ask the AI guide',
          privacy: 'Your language choice is counted anonymously, only to estimate how many international visitors come.',
          crowd_now: 'Crowd now', live: 'Live', sample: 'Sample', now: 'Now', forecast: 'Forecast',
          tip_head: 'Least crowded first', source: 'Crowd data: Seoul real-time city data', source_sample: ' · showing sample values',
          ask: 'Ask anything', send: 'Send' },
    ja: { nav_guide: 'AIガイド', nav_home: 'ホーム', nav_map: '混雑マップ', ask_guide: 'AIガイドに聞く',
          privacy: '選択した言語は匿名で集計され、海外からの来場者数の推定にのみ使われます。',
          crowd_now: 'Crowd now', live: 'リアルタイム', sample: 'サンプル', now: '今', forecast: '予測',
          tip_head: '空いている順', source: '混雑度：ソウル市リアルタイム都市データ', source_sample: '・サンプル値を表示中',
          ask: '何でも聞いてください', send: '送信' },
    zh: { nav_guide: 'AI导览', nav_home: '首页', nav_map: '拥挤地图', ask_guide: '问AI导览',
          privacy: '所选语言仅以匿名方式统计，用于估算外国游客规模。',
          crowd_now: 'Crowd now', live: '实时', sample: '示例', now: '现在', forecast: '预测',
          tip_head: '人少优先', source: '拥挤度：首尔实时城市数据', source_sample: '・显示示例数值',
          ask: '请随便提问', send: '发送' }
  };

  function getLang() {
    try { const v = localStorage.getItem('cm_lang'); if (v && LANGS[v]) return v; } catch (e) {}
    return 'ko';
  }
  function setLang(code) {
    if (!LANGS[code]) return;
    try { localStorage.setItem('cm_lang', code); } catch (e) {}
    logLanguage(code);
    applyI18n();
    document.dispatchEvent(new CustomEvent('cm:lang', { detail: code }));
  }
  function t(key) { const l = getLang(); return (I18N[l] && I18N[l][key]) || I18N.ko[key] || key; }

  function applyI18n() {
    const l = getLang();
    document.documentElement.lang = l;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-lang-label]').forEach(el => { el.textContent = LANGS[l]; });
    document.querySelectorAll('[data-lang-pick]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.langPick === l)));
  }

  /* 언어 선택 익명 집계: 언어 코드와 시각만 보냄. 서버(/api/lang)가 없으면 조용히 무시 */
  function logLanguage(code) {
    try {
      const body = JSON.stringify({ lang: code, at: new Date().toISOString(), page: location.pathname.split('/').pop() || 'index.html' });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/lang', body);
    } catch (e) {}
  }

  /* ---------- 축제 장소 ----------
     area: 서울 실시간 도시데이터 장소명. 열린데이터광장 '서울시 주요 121장소 목록'의 이름과 정확히 같아야 함 */
  const PLACES = [
    { id: 'play', area: '성수카페거리', map: '리얼월드 성수',
      name: { ko: '플레이성수 · 컬러 어드벤처', en: 'Play Seongsu · Color Adventure', ja: 'プレイ聖水・カラーアドベンチャー', zh: 'Play圣水・色彩冒险' },
      short: { ko: '컬러 어드벤처', en: 'Color Adventure', ja: 'カラーアドベンチャー', zh: '色彩冒险' },
      sub: { ko: '리얼월드 성수 1층 · 11–17시 수령', en: 'Realworld Seongsu 1F · kit pickup 11:00–17:00', ja: 'リアルワールド聖水1階・キット受取 11–17時', zh: 'Realworld圣水1楼・11:00–17:00领取套件' } },
    { id: 'expo', area: '성수카페거리', map: '에스팩토리 성수',
      name: { ko: '주제전시 & 퍼포먼스', en: 'Main Exhibition & Performance', ja: 'テーマ展示&パフォーマンス', zh: '主题展览与表演' },
      short: { ko: '주제전시', en: 'Exhibition', ja: 'テーマ展示', zh: '主题展览' },
      sub: { ko: '에스팩토리 · 10.8–10.11 무료', en: 'S-Factory · Oct 8–11 · Free', ja: 'エスファクトリー・10/8–10/11・無料', zh: 'S-Factory・10月8日–11日・免费' } },
    { id: 'summit', area: '성수카페거리', map: '에스팩토리 성수 D동',
      name: { ko: '서밋 · 컨퍼런스 & 피치', en: 'Summit · Conference & Pitch', ja: 'サミット・カンファレンス&ピッチ', zh: '峰会・会议与路演' },
      short: { ko: '서밋', en: 'Summit', ja: 'サミット', zh: '峰会' },
      sub: { ko: '에스팩토리 D동 · 10.8–10.11 무료', en: 'S-Factory Bldg D · Oct 8–11 · Free', ja: 'エスファクトリーD棟・10/8–10/11・無料', zh: 'S-Factory D栋・10月8日–11日・免费' } },
    { id: 'film', area: '서울숲공원', map: '성수아트홀',
      name: { ko: '필름성수 · 성수메이드', en: 'Film Seongsu · Seongsu Made', ja: 'フィルム聖水・聖水メイド', zh: '电影圣水・圣水制造' },
      short: { ko: '필름성수', en: 'Film Seongsu', ja: 'フィルム聖水', zh: '电影圣水' },
      sub: { ko: '성수아트홀 · 서울숲 등', en: 'Seongsu Art Hall · Seoul Forest, etc.', ja: '聖水アートホール・ソウルの森など', zh: '圣水艺术厅・首尔林等' } }
  ];
  /* 지역 이름 표시용 번역 (API 호출에는 한국어 이름을 그대로 사용) */
  const AREA_NAMES = {
    '성수카페거리': { en: 'Seongsu Cafe Street', ja: '聖水カフェ通り', zh: '圣水咖啡街' },
    '서울숲공원': { en: 'Seoul Forest Park', ja: 'ソウルの森公園', zh: '首尔林公园' }
  };
  /* {ko, en, ja, zh} 객체에서 현재 언어 값을 고름. 문자열이면 그대로 */
  function L(v) { if (!v || typeof v === 'string') return v || ''; return v[getLang()] || v.en || v.ko; }
  function areaName(area) { const l = getLang(); return l === 'ko' ? area : ((AREA_NAMES[area] && AREA_NAMES[area][l]) || area); }
  const mapUrl = q => 'https://map.naver.com/p/search/' + encodeURIComponent(q);

  /* ---------- 서울 실시간 도시데이터 ----------
     브라우저에서 서울시 API(http)를 바로 부르면 막히므로 /api/citydata 서버 함수를 거침 */
  const SAMPLE = {
    '성수카페거리': { level: '붐빔', min: 6500, max: 7000, time: null,
      forecast: [7000, 6800, 6200, 5600, 4800, 4200, 3600].map((v, i) => ({ max: v, min: v - 500, level: i < 2 ? '붐빔' : i < 4 ? '약간 붐빔' : '보통' })) },
    '서울숲공원': { level: '여유', min: 3000, max: 3500, time: null,
      forecast: [3500, 3800, 4000, 3900, 3500, 3000, 2600].map(v => ({ max: v, min: v - 500, level: '여유' })) }
  };
  const cache = {};
  async function getCrowd(area) {
    if (cache[area]) return cache[area];
    const p = (async () => {
      try {
        const res = await fetch('/api/citydata?area=' + encodeURIComponent(area), { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data || !data.level) throw new Error('empty');
        return Object.assign({ live: true }, data);
      } catch (e) {
        return Object.assign({ live: false, area }, SAMPLE[area] || SAMPLE['성수카페거리']);
      }
    })();
    cache[area] = p;
    return p;
  }

  /* 혼잡 단계 → 표시 클래스 */
  function levelClass(level) {
    if (level === '붐빔' || level === '약간 붐빔') return 'busy';
    if (level === '여유') return 'calm';
    return 'mid';
  }
  const LEVEL_TEXT = {
    en: { '여유': 'Relaxed', '보통': 'Normal', '약간 붐빔': 'Busy', '붐빔': 'Very busy' },
    ja: { '여유': '空いている', '보통': '普通', '약간 붐빔': 'やや混雑', '붐빔': '混雑' },
    zh: { '여유': '宽松', '보통': '一般', '약간 붐빔': '略拥挤', '붐빔': '拥挤' }
  };
  function levelText(level) { const l = getLang(); return (LEVEL_TEXT[l] && LEVEL_TEXT[l][level]) || level; }
  function formatCount(min, max) {
    const k = n => (n / 1000).toFixed(1) + 'k';
    const unit = { ko: '명', en: ' people', ja: '人', zh: '人' }[getLang()] || '';
    return `${k(max)} – ${k(min)}${unit}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-lang-pick]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.langPick)));
    applyI18n();
  });

  window.CM = { LANGS, getLang, setLang, t, applyI18n, PLACES, L, areaName, mapUrl, getCrowd, levelClass, levelText, formatCount };
})();
