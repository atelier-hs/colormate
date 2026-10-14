/* 혼잡 지도: 장소를 누르면 위 카드가 그 장소의 실시간 혼잡도로 바뀜 */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const MAP_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"></path><path d="M9 4v14"></path><path d="M15 6v14"></path></svg>';
  let selected = CM.PLACES[0].id;

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function renderList(crowds) {
    $('places').innerHTML = CM.PLACES.map(p => {
      const d = crowds[p.area];
      return `<div class="place" aria-current="${p.id === selected}">
        <button type="button" class="place-pick" data-id="${p.id}"><strong>${esc(CM.L(p.name))}</strong><span>${esc(CM.L(p.sub))}</span></button>
        <span class="level ${CM.levelClass(d.level)}">${esc(CM.levelText(d.level))}</span>
        <a class="map-link" href="${CM.mapUrl(p.map)}" target="_blank" rel="noopener" aria-label="${esc(CM.L(p.name))} map">${MAP_ICON}</a>
      </div>`;
    }).join('');
    $('places').querySelectorAll('.place-pick').forEach(b => b.addEventListener('click', () => { selected = b.dataset.id; render(); }));
  }

  function renderCard(place, d) {
    $('crowdArea').textContent = CM.areaName(place.area);
    $('crowdCount').textContent = CM.formatCount(d.min, d.max);
    $('crowdLevel').textContent = CM.levelText(d.level);
    const series = [{ max: d.max, now: true }].concat((d.forecast || []).slice(0, 7));
    const top = Math.max.apply(null, series.map(s => s.max)) || 1;
    $('bars').innerHTML = series.map(s => `<i class="${s.now ? 'now' : ''}" style="height:${Math.max(8, Math.round(s.max / top * 54))}px"></i>`).join('');
    $('crowdTime').textContent = d.time ? d.time.slice(11, 16) : new Date().toTimeString().slice(0, 5);
  }

  function renderTip(crowds) {
    const order = ['여유', '보통', '약간 붐빔', '붐빔'];
    const areas = Object.keys(crowds).sort((a, b) => order.indexOf(crowds[a].level) - order.indexOf(crowds[b].level));
    const calm = CM.PLACES.filter(p => p.area === areas[0]).map(p => CM.L(p.short));
    const first = CM.areaName(areas[0]), last = CM.areaName(areas[areas.length - 1]);
    const text = {
      ko: `${first} 쪽(${calm.join(', ')})부터, ${last}는 나중에`,
      en: `Start around ${first} (${calm.join(', ')}), visit ${last} later`,
      ja: `${first}（${calm.join('、')}）から回り、${last}は後で`,
      zh: `先去${first}（${calm.join('、')}），${last}稍后再去`
    };
    $('tipText').textContent = text[CM.getLang()] || text.en;
  }

  async function render() {
    const areas = [...new Set(CM.PLACES.map(p => p.area))];
    const list = await Promise.all(areas.map(a => CM.getCrowd(a)));
    const crowds = {};
    areas.forEach((a, i) => { crowds[a] = list[i]; });
    const place = CM.PLACES.find(p => p.id === selected);
    const d = crowds[place.area];
    renderCard(place, d);
    renderList(crowds);
    renderTip(crowds);
    const live = list.every(x => x.live);
    $('liveChip').textContent = live ? CM.t('live') : CM.t('sample');
    $('sourceNote').textContent = CM.t('source') + (live ? '' : CM.t('source_sample'));
  }

  document.addEventListener('cm:lang', render);
  document.addEventListener('DOMContentLoaded', render);
})();
