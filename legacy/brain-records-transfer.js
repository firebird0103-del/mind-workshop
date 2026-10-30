(function (root) {
  'use strict';
  const D = root.BrainRecordsData, $ = id => document.getElementById(id);
  let pending = null, busy = false;
  function status(message, error = false) {
    $('records-transfer-status').textContent = message;
    $('records-transfer-status').classList.toggle('is-error', error);
  }
  function setBusy(value) {
    busy = value;
    document.querySelectorAll('[data-transfer-control], #stats-modal .clear-btn').forEach(el => { el.disabled = value; });
    $('records-transfer').setAttribute('aria-busy', String(value));
  }
  function download(bytes, filename) {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function localFileStamp(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('') + '-' +
      [date.getHours(), date.getMinutes(), date.getSeconds()].map(n => String(n).padStart(2, '0')).join('');
  }
  async function exportRecords() {
    if (busy) return;
    setBusy(true); status('正在整理完整紀錄與 Excel，請稍候…');
    try {
      const snapshot = D.readLocal(), records = await D.identify(snapshot.records), backup = D.manifest(records);
      const json = JSON.stringify(backup, null, 2);
      if (new TextEncoder().encode(json).length > D.LIMIT_BYTES) throw new Error('備份超過目前 20 MB 的匯入上限，尚未匯出；請保留現有紀錄。');
      const workbook = await root.BrainRecordsWorkbook.create(backup), archive = new root.JSZip();
      archive.file('研究資料.xlsx', workbook); archive.file(D.BACKUP_FILE, json);
      archive.file('使用說明.txt', '心智大作戰｜研究資料與完整備份\r\n\r\n研究整理：解壓縮後用 Excel 開啟「研究資料.xlsx」。\r\n還原紀錄：遊玩紀錄 → 匯入備份 → 選擇本 ZIP 或完整備份.json。\r\n匯入前可預覽筆數；合併會略過重複識別碼，取代會覆寫目前紀錄。\r\nExcel 為匯出快照；編輯 Excel 不會修改 JSON 或瀏覽器紀錄。\r\n統計單位是遊玩次數，不是獨立參與人數。\r\n');
      const bytes = await archive.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      if (bytes.length > D.LIMIT_BYTES) throw new Error('ZIP 超過目前匯入上限，尚未匯出；請保留現有紀錄。');
      // Export is read-only, so even a full storage quota cannot prevent making a backup.
      // Deterministic legacy IDs are materialised in local storage when the archive is imported.
      if (root.localStorage.getItem('game_history') !== snapshot.raw) throw new Error('目前紀錄已變更，請重新匯出最新資料。');
      download(bytes, '心智大作戰_研究與備份_' + localFileStamp(new Date()) + '.zip');
      resetPreview(false);
      status(`已產生 ${records.length} 筆紀錄的 ZIP，請確認瀏覽器下載完成。內含研究資料.xlsx 與完整備份.json。`);
    } catch (error) { status(error.message || '匯出失敗，請重新嘗試。', true); }
    finally { setBusy(false); }
  }
  function resetPreview(focus = true) {
    pending = null; $('records-import-preview').hidden = true; $('records-import-file').value = '';
    if (focus) { status('已取消匯入。'); $('records-import-button').focus(); }
  }
  function updatePreview() {
    if (!pending) return;
    const replace = $('records-mode-replace').checked, local = pending.local.records, incoming = pending.backup.records;
    const merged = pending.merged;
    $('records-import-counts').textContent = `檔案：${pending.filename}\n匯出時間：${new Date(pending.backup.exportedAt).toLocaleString()}\n備份共有 ${incoming.length} 筆；目前瀏覽器有 ${local.length} 筆。`;
    const groups = new Map(); incoming.forEach(r => groups.set(r.gameName, (groups.get(r.gameName) || 0) + 1));
    $('records-import-games').textContent = groups.size ? Array.from(groups, ([game, count]) => `${game} ${count} 筆`).join('／') : '這是一份空白紀錄備份。';
    $('records-import-effect').textContent = replace
      ? `取代後為 ${incoming.length} 筆。原有 ${local.length} 筆紀錄將被這份備份取代，建議先匯出目前紀錄。`
      : pending.mergeError || `新增 ${merged.added} 筆，略過重複 ${merged.skipped} 筆；合併後共 ${merged.records.length} 筆。新匯入的紀錄會接在目前紀錄之後。`;
    $('records-import-confirm').disabled = busy || (!replace && !!pending.mergeError);
    $('records-import-confirm').textContent = replace ? '確認取代目前紀錄' : local.length ? '確認合併紀錄' : '確認還原紀錄';
  }
  async function prepareImport(file) {
    if (!file || busy) return;
    resetPreview(false); setBusy(true); status('正在檢查備份，尚未更動紀錄…');
    try {
      const backup = await D.readFile(file), local = D.readLocal();
      local.records = await D.identify(local.records);
      let merged, mergeError;
      try { merged = D.merge(local.records, backup.records); } catch (error) { mergeError = error.message; }
      pending = { filename: file.name, backup, local, merged, mergeError };
      root.renderModalData(local.records);
      $('records-mode-merge').checked = true; $('records-import-preview').hidden = false;
      status('備份檢查完成。請確認以下內容，再執行匯入。');
    } catch (error) { status(error.message || '無法讀取備份；目前紀錄未變更。', true); }
    finally { setBusy(false); updatePreview(); }
    if (pending) { $('records-import-preview').scrollIntoView({ block: 'nearest' }); $('records-mode-merge').focus(); }
  }
  function confirmImport() {
    if (!pending || busy) return;
    const replace = $('records-mode-replace').checked;
    if (replace && !root.confirm(`確定用備份的 ${pending.backup.records.length} 筆，取代目前 ${pending.local.records.length} 筆紀錄？`)) return;
    try {
      if (!replace && pending.mergeError) throw new Error(pending.mergeError);
      const records = replace ? pending.backup.records : pending.merged.records;
      D.commit(records, pending.local.raw);
      const message = replace ? `已還原 ${records.length} 筆紀錄。` : `匯入完成：新增 ${pending.merged.added} 筆，略過重複 ${pending.merged.skipped} 筆，目前共 ${records.length} 筆。`;
      resetPreview(false); root.renderModalData(records); status(message);
      $('records-import-button').focus();
    } catch (error) { status(error.message || '匯入失敗，請重新選擇備份。', true); }
  }
  $('records-export-button').addEventListener('click', exportRecords);
  $('records-import-button').addEventListener('click', () => $('records-import-file').click());
  $('records-import-file').addEventListener('change', event => prepareImport(event.target.files[0]));
  $('records-import-cancel').addEventListener('click', () => resetPreview());
  $('records-import-confirm').addEventListener('click', confirmImport);
  ['records-mode-merge', 'records-mode-replace'].forEach(id => $(id).addEventListener('change', updatePreview));
  root.BrainRecordsTransfer = { exportRecords, prepareImport, resetPreview, status };
})(window);
