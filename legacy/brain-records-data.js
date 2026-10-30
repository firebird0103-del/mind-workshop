/* v10.7 — local record interchange and shared dashboard calculations. */
(function (root) {
  'use strict';
  const FORMAT = 'brain-challenge-records', SCHEMA = 1, VERSION = '10.7';
  const LIMIT_BYTES = 20 * 1024 * 1024, LIMIT_EXPANDED = 50 * 1024 * 1024, LIMIT_RECORDS = 100000;
  const BACKUP_FILE = '完整備份.json';
  const textFields = ['gameName', 'playerName', 'age', 'timestamp', 'timeText', 'recordId', 'recordedAtISO', 'appVersion'];
  function fail(message) { throw new Error(message); }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
    return JSON.stringify(value);
  }
  function validateRecords(records, requireIds = false) {
    if (!Array.isArray(records) || records.length > LIMIT_RECORDS) fail('紀錄格式不正確，或超過 100,000 筆上限。');
    const ids = new Set();
    records.forEach((r, i) => {
      const prefix = `第 ${i + 1} 筆紀錄：`;
      if (!r || Array.isArray(r) || typeof r !== 'object') fail(prefix + '格式不正確。');
      if (Object.prototype.hasOwnProperty.call(r, '__proto__')) fail(prefix + '包含不支援的欄位。');
      if (typeof r.gameName !== 'string' || !r.gameName.trim()) fail(prefix + '缺少關卡名稱。');
      if (typeof r.score !== 'number' || !Number.isFinite(r.score) || Math.abs(r.score) > Number.MAX_SAFE_INTEGER) fail(prefix + '分數必須是有效數字。');
      if (r.totalSeconds !== undefined && (typeof r.totalSeconds !== 'number' || !Number.isFinite(r.totalSeconds) || r.totalSeconds < 0 || r.totalSeconds > Number.MAX_SAFE_INTEGER)) fail(prefix + '作答秒數不正確。');
      textFields.forEach(k => {
        if (r[k] !== undefined && (typeof r[k] !== 'string' || r[k].length > 4000)) fail(prefix + k + ' 內容不正確或過長。');
      });
      if (requireIds && !r.recordId) fail(prefix + '缺少紀錄識別碼。');
      if (r.recordId) {
        if (r.recordId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(r.recordId)) fail(prefix + '紀錄識別碼不正確。');
        if (ids.has(r.recordId)) fail(prefix + '紀錄識別碼重複。');
        ids.add(r.recordId);
      }
    });
    return records;
  }
  function readLocal() {
    // Read directly so corrupt or inaccessible storage cannot masquerade as an empty history.
    let raw, records;
    try { raw = root.localStorage.getItem('game_history'); records = raw === null ? [] : JSON.parse(raw); }
    catch (_) { fail('無法讀取目前紀錄，請先保留瀏覽器資料並重新開啟遊戲。'); }
    validateRecords(records);
    return { raw, records: records.map(r => root.BrainChallenge.scores.normalize(r)) };
  }
  function commit(records, expectedRaw) {
    validateRecords(records, true);
    if (root.localStorage.getItem('game_history') !== expectedRaw) fail('目前紀錄已變更，請重新預覽或匯出。');
    try { root.localStorage.setItem('game_history', JSON.stringify(records)); }
    catch (_) { fail('儲存空間不足或瀏覽器不允許儲存；目前紀錄未被取代。'); }
  }
  async function identify(records) {
    // A deterministic ID plus occurrence number preserves genuinely identical legacy rows.
    // It also recognises the same legacy archive on another device without using player names as IDs.
    const occurrences = new Map(), hashes = new Map(), result = [];
    for (const r of records) {
      const content = Object.assign({}, r); delete content.recordId;
      const key = canonical(content), occurrence = (occurrences.get(key) || 0) + 1;
      occurrences.set(key, occurrence);
      if (r.recordId) { result.push(Object.assign({}, r)); continue; }
      if (!hashes.has(key)) {
        if (!root.crypto?.subtle) fail('此瀏覽器無法建立備份識別碼，請使用新版 Edge 或 Chrome 開啟遊戲。');
        const digest = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
        hashes.set(key, Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join(''));
      }
      result.push(Object.assign({}, r, { recordId: 'legacy-' + hashes.get(key) + '-' + occurrence }));
    }
    return validateRecords(result, true);
  }
  function ranking(records, gameName) {
    return records.filter(r => r.gameName === gameName).map(r => Object.assign({}, r, {
      playerName: (r.playerName || '訪客').trim() || '訪客', _score: Number(r.score) || 0,
      _seconds: Number.isFinite(Number(r.totalSeconds)) ? Number(r.totalSeconds) : 999999
    })).sort((a, b) => b._score - a._score || a._seconds - b._seconds || String(b.timestamp || '').localeCompare(String(a.timestamp || ''))).slice(0, 5);
  }
  function summary(records) {
    const games = new Map();
    records.forEach(r => {
      if (!games.has(r.gameName)) games.set(r.gameName, new Map());
      const ages = games.get(r.gameName), age = r.age || '未知';
      if (!ages.has(age)) ages.set(age, { gameName: r.gameName, age, count: 0, totalScore: 0, totalSeconds: 0 });
      const row = ages.get(age); row.count++; row.totalScore += r.score; row.totalSeconds += r.totalSeconds || 0;
    });
    return Array.from(games.values()).flatMap(ages => Array.from(ages.values())).map(r => Object.assign(r, {
      averageScore: r.totalScore / r.count, averageSeconds: r.totalSeconds / r.count,
      displayScore: Math.round(r.totalScore / r.count), displaySeconds: Math.round(r.totalSeconds / r.count)
    }));
  }
  const recent = records => records.slice().reverse().slice(0, 10);
  function manifest(records) {
    return { format: FORMAT, schemaVersion: SCHEMA, exportedAt: new Date().toISOString(),
      appVersion: VERSION, recordCount: records.length, records };
  }
  function parseBackup(text) {
    let backup;
    try { backup = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (_) { fail('備份內容不是有效的 JSON。'); }
    if (!backup || backup.format !== FORMAT) fail('這不是心智大作戰的完整備份檔，請選擇匯出的 ZIP 或完整備份.json。');
    if (backup.schemaVersion !== SCHEMA) fail('此備份格式版本尚不支援，請使用相容版本的遊戲。');
    validateRecords(backup.records, true);
    if (backup.recordCount !== backup.records.length || typeof backup.exportedAt !== 'string' || !Number.isFinite(Date.parse(backup.exportedAt))) fail('備份筆數或匯出日期不正確。');
    // Preserve all record fields; only the existing game-name compatibility mapping is applied.
    backup.records = backup.records.map(r => root.BrainChallenge.scores.normalize(r));
    return backup;
  }
  function inspectZip(bytes) {
    // Bound uncompressed sizes before any inflater runs (also rejects ZIP64/encrypted/multipart archives).
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
    }
    if (end < 0) fail('ZIP 已損壞或格式不支援。');
    const count = view.getUint16(end + 10, true), size = view.getUint32(end + 12, true);
    let offset = view.getUint32(end + 16, true), expanded = 0;
    if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== count || count > 30 || offset + size !== end) fail('請選擇遊戲匯出的原始 ZIP。');
    for (let i = 0; i < count; i++) {
      if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) fail('ZIP 目錄不完整。');
      if (view.getUint16(offset + 8, true) & 1) fail('不支援加密 ZIP。');
      expanded += view.getUint32(offset + 24, true);
      if (expanded > LIMIT_EXPANDED) fail('ZIP 解壓縮後超過 50 MB 上限。');
      offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    }
    if (offset !== end) fail('ZIP 目錄不正確。');
  }
  async function readFile(file) {
    if (!file || file.size > LIMIT_BYTES) fail('請選擇 20 MB 以下的 ZIP 或 JSON 備份。');
    if (/\.json$/i.test(file.name)) return parseBackup(await file.text());
    if (!/\.zip$/i.test(file.name)) fail('請選擇 ZIP 或 JSON 備份；Excel 僅供研究整理。');
    const bytes = new Uint8Array(await file.arrayBuffer()); inspectZip(bytes);
    let zip;
    try { zip = await root.JSZip.loadAsync(bytes, { checkCRC32: true }); } catch (_) { fail('ZIP 已損壞，無法讀取備份。'); }
    const entry = zip.file(BACKUP_FILE);
    if (!entry) fail('ZIP 中找不到完整備份.json，請選擇「匯出資料」產生的備份。');
    const text = await entry.async('string');
    if (new TextEncoder().encode(text).length > LIMIT_BYTES) fail('JSON 備份超過 20 MB 上限。');
    return parseBackup(text);
  }
  function merge(current, incoming) {
    const byId = new Map(current.map(r => [r.recordId, r])), result = current.slice();
    let skipped = 0;
    incoming.forEach(r => {
      const existing = byId.get(r.recordId);
      if (existing) {
        if (canonical(existing) !== canonical(r)) fail('相同識別碼的紀錄內容不同，請核對備份；尚未匯入任何資料。');
        skipped++;
      } else { result.push(r); byId.set(r.recordId, r); }
    });
    validateRecords(result, true);
    return { records: result, added: result.length - current.length, skipped };
  }
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  root.BrainRecordsData = { VERSION, BACKUP_FILE, LIMIT_BYTES, LIMIT_RECORDS, canonical, validateRecords, readLocal,
    commit, identify, ranking, summary, recent, manifest, parseBackup, readFile, merge, escapeHTML };
})(window);
