// Preserve v10.7 ordering and independent records (including repeated names),
// presented natively inside the Brain Workshop UI without jumping back to the old homepage.
export function topFive(history, game) {
  return history
    .filter(r => r && r.gameName === game)
    .map(r => ({
      ...r,
      playerName: String(r.playerName || '訪客').trim() || '訪客',
      _score: Number(r.score) || 0,
      _seconds: Number.isFinite(Number(r.totalSeconds)) ? Number(r.totalSeconds) : 999999
    }))
    .sort((a, b) => b._score - a._score || a._seconds - b._seconds || String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    .slice(0, 5);
}

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

export function showRankings(panel, content, open, games, core, onManage) {
  const history = core.scores.getHistory().filter(r => r && typeof r === 'object');
  const player = core.player.getName();
  let active = 0, view = 'rank';
  const e = escapeHTML;
  panel.classList.add('ranking-panel');
  panel.addEventListener('close', () => panel.classList.remove('ranking-panel'), {once: true});
  content.innerHTML =
    '<div class="eyebrow">WORKSHOP HALL OF FAME</div>' +
    '<h2>腦內工坊英雄榜</h2>' +
    '<p class="rank-intro">每一次完成工作室挑戰，都會留存成績並推進工坊創作。</p>' +
    '<div class="rank-game-tabs" id="rankGames"></div>' +
    '<div class="rank-view-tabs">' +
      '<button data-view="rank">TOP 5</button>' +
      '<button data-view="history">最近紀錄</button>' +
      '<button data-view="stats">年齡組統計</button>' +
    '</div>' +
    '<div id="rankingBody"></div>' +
    '<p class="muted">本機成績 · 同名可重複上榜 · 分數優先，同分比時間，再比紀錄新舊。</p>';

  if (onManage) {
    const manage = document.createElement('button');
    manage.className = 'rank-manage';
    manage.textContent = '匯出／匯入紀錄 ↗';
    manage.onclick = onManage;
    content.querySelector('.rank-intro').after(manage);
  }

  const gameNav = content.querySelector('#rankGames');
  games.forEach((g, i) => {
    const b = document.createElement('button');
    b.textContent = g.name;
    b.style.setProperty('--accent', g.color);
    b.onclick = () => {
      active = i;
      render();
    };
    gameNav.append(b);
  });

  content.querySelectorAll('[data-view]').forEach(b => {
    b.onclick = () => {
      view = b.dataset.view;
      render();
    };
  });

  function render() {
    [...gameNav.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === active)));
    content.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    const name = games[active].name;
    const records = history.filter(r => r.gameName === name);
    const body = content.querySelector('#rankingBody');

    if (!records.length) {
      body.innerHTML =
        '<div class="rank-empty"><span>⚙</span><h3>這座工作室的第一筆紀錄，等你來創造！</h3><p>完成「' +
        e(name) +
        '」挑戰後，就能在工坊英雄榜看到成績。</p></div>';
      return;
    }

    if (view === 'rank') {
      body.innerHTML =
        '<ol class="ranking-list">' +
        topFive(history, name)
          .map(
            (r, i) =>
              '<li class="' +
              (r.playerName === player && player !== '訪客' ? 'is-me' : '') +
              '"><b class="rank-place">' +
              (i + 1) +
              '</b><div><strong>' +
              e(r.playerName) +
              (r.playerName === player && player !== '訪客' ? ' <small>你</small>' : '') +
              '</strong><small>' +
              e(r.age || '未設定年齡') +
              '</small></div><div class="rank-score"><strong>' +
              e(r.score) +
              '<small> 分</small></strong><small>' +
              e(r.timeText || (r._seconds === 999999 ? '時間未記錄' : r._seconds + '秒')) +
              '</small></div></li>'
          )
          .join('') +
        '</ol>';
    } else if (view === 'history') {
      body.innerHTML =
        '<div class="rank-history">' +
        records
          .slice()
          .reverse()
          .slice(0, 10)
          .map(
            r =>
              '<article><div><strong>' +
              e(r.playerName || '訪客') +
              '</strong><span>' +
              e(r.score) +
              ' 分 · ' +
              e(r.timeText || '') +
              '</span></div><small>' +
              e(r.timestamp) +
              '</small></article>'
          )
          .join('') +
        '</div>';
    } else {
      const groups = new Map();
      for (const r of records) {
        const key = String(r.age || '未設定');
        const g = groups.get(key) || {count: 0, score: 0, seconds: 0};
        g.count++;
        g.score += Number(r.score) || 0;
        g.seconds += Number(r.totalSeconds) || 0;
        groups.set(key, g);
      }
      body.innerHTML =
        '<div class="rank-stat-grid">' +
        [...groups]
          .map(
            ([age, g]) =>
              '<article><h3>' +
              e(age) +
              '</h3><strong>' +
              Math.round(g.score / g.count) +
              '<small> 平均分</small></strong><p>' +
              g.count +
              ' 次挑戰 · 平均 ' +
              Math.round(g.seconds / g.count) +
              ' 秒</p></article>'
          )
          .join('') +
        '</div>';
    }
  }
  render();
  open(panel);
}
