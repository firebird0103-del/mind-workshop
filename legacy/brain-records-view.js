(function (root) {
  'use strict';
  root.BrainRecordsView = { render(history) {
    const D = root.BrainRecordsData, esc = D.escapeHTML;
    document.getElementById('modal-history-area').innerHTML = D.recent(history).map(r => `<div class="record-item">
      <strong>${esc(r.gameName)}</strong> - <span style="color:#e67e22;">${esc(r.playerName || '訪客')}</span><br>
      得分：${r.score} | 時間：${esc(r.timeText)}<br><small style="color:#806f60;">${esc(r.timestamp)}</small></div>`).join('') || '<div class="rank-empty">目前還沒有遊玩紀錄。可完成一關，或從下方匯入備份。</div>';
    const currentPlayer = root.BrainChallenge.player.getName();
    document.getElementById('modal-rank-area').innerHTML = root.BrainChallenge.games.map(game => {
      const top = D.ranking(history, game.title); if (!top.length) return '';
      const mine = currentPlayer !== '訪客' ? top.findIndex(r => r.playerName === currentPlayer) : -1;
      return `<div class="rank-card"><div class="rank-head"><div style="font-weight:900;color:#856404;">🏆 ${esc(game.title)} Top 5</div><div class="rank-note">分數優先・同分比時間</div></div>` +
        top.map((r, i) => {
          const isMe = currentPlayer !== '訪客' && r.playerName === currentPlayer;
          return `<div class="rank-item ${i < 3 ? 'top' + (i + 1) : ''}" ${isMe ? 'style="background:#eefaff;border-radius:10px;padding-left:8px;padding-right:8px;"' : ''}>
            <span class="rank-number">${i + 1}</span><span style="flex:1;min-width:0;"><span style="font-weight:900;color:#2c3e50;">${esc(r.playerName)}${isMe ? ' <span style="color:#1686bd;font-size:.78rem;">你</span>' : ''}</span>
            <span style="font-size:.8rem;color:#7f8c8d;">(${esc(r.age || '未設定')})</span></span>
            <span style="text-align:right;white-space:nowrap;"><span style="font-weight:900;color:var(--danger-color);font-size:1.05rem;">${r.score}分</span><br><span style="font-size:.8rem;color:#27ae60;">⏱️ ${esc(r.timeText || `${r._seconds}秒`)}</span></span></div>`;
        }).join('') + (mine >= 0 ? `<div class="my-rank">你目前最高名次：第 ${mine + 1} 名 ・ ${top[mine]._score} 分</div>` : '') + '</div>';
    }).join('') || '<div class="rank-empty">尚未有排名數據。可完成一關，或從下方匯入備份。</div>';
    const groups = new Map();
    D.summary(history).forEach(r => {
      if (!groups.has(r.gameName)) groups.set(r.gameName, []);
      groups.get(r.gameName).push(r);
    });
    document.getElementById('modal-stats-area').innerHTML = Array.from(groups, ([game, rows]) => `<div class="record-item" style="border-left-color:var(--secondary-color);"><strong>${esc(game)}</strong><br>` + rows.map(r => {
      const time = `${Math.floor(r.displaySeconds / 60)}分${String(r.displaySeconds % 60).padStart(2, '0')}秒`;
      return `<div style="font-size:.9rem;margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;justify-content:space-between;"><span>📅 ${esc(r.age)} 區間 (${r.count}次)</span><span>平均: <b style="color:var(--primary-color);">${r.displayScore}分</b> / <b style="color:#27ae60;">${time}</b></span></div>`;
    }).join('') + '</div>').join('') || '<div class="rank-empty">尚未有分析數據。</div>';
    document.getElementById('records-total').textContent = `目前共 ${history.length} 筆遊玩紀錄`;
  } };
})(window);
