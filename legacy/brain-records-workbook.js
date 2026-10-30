/* Offline browser XLSX writer: five snapshot sheets, no formulas or external links.
 * Uses standard OOXML inside ZIP; arbitrary player text is always an inline string.
 */
(function (root) {
  'use strict';
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const xml = value => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/_x([0-9a-f]{4})_/gi, '_x005F_x$1_').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const doc = body => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + body;
  function column(index) { let s = ''; for (index++; index; index = Math.floor((index - 1) / 26)) s = String.fromCharCode(65 + (index - 1) % 26) + s; return s; }
  function sheetXML(sheet) {
    const rows = [sheet.headers, ...sheet.rows], last = column(sheet.headers.length - 1) + rows.length;
    const data = rows.map((row, i) => '<row r="' + (i + 1) + '" ht="' + (i ? sheet.note ? 52 : 48 : 34) + '" customHeight="1">' + row.map((value, j) => {
      const cell = column(j) + (i + 1), style = i === 0 ? 1 : typeof value === 'number' ? Number.isInteger(value) ? 2 : 3 : 4;
      return typeof value === 'number' && Number.isFinite(value)
        ? `<c r="${cell}" s="${style}"><v>${value}</v></c>`
        : `<c r="${cell}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    }).join('') + '</row>').join('');
    return doc(`<worksheet xmlns="${NS}"><dimension ref="A1:${last}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="26"/><cols>${sheet.widths.map((width, j) => `<col min="${j + 1}" max="${j + 1}" width="${width}" customWidth="1"/>`).join('')}</cols><sheetData>${data}</sheetData>${!sheet.note && sheet.rows.length ? `<autoFilter ref="A1:${last}"/>` : ''}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9"/></worksheet>`);
  }
  function buildSheets(backup) {
    const D = root.BrainRecordsData, records = backup.records;
    const headers = ['紀錄識別碼', '紀錄日期時間（原文）', '完成時間 ISO（新版）', '玩家名稱', '年齡區間', '關卡', '得分', '作答秒數', '作答時間（文字）', '紀錄版本'];
    const widths = [29, 29, 29, 22, 16, 22, 12, 15, 23, 15];
    const row = r => [r.recordId, r.timestamp || '', r.recordedAtISO || '', r.playerName || '訪客', r.age || '未設定', r.gameName, r.score, r.totalSeconds ?? '', r.timeText || '', r.appVersion || ''];
    const games = (root.BrainChallenge.games || []).map(g => g.title);
    const rankRows = games.flatMap(game => D.ranking(records, game).map((r, i) => [game, i + 1, r.playerName, r.age || '未設定', r.score, r.totalSeconds ?? '', r.timestamp || '', r.recordId]));
    const stats = D.summary(records);
    return [
      { name: '全部遊玩紀錄', headers, widths, rows: records.map(row) },
      { name: '英雄榜', headers: ['關卡', '名次', '玩家名稱', '年齡區間', '得分', '作答秒數', '紀錄日期時間（原文）', '紀錄識別碼'], widths: [22, 10, 22, 16, 12, 15, 29, 29], rows: rankRows },
      { name: '趨勢分析', headers: ['關卡', '年齡區間', '遊玩次數', '平均得分（畫面取整）', '平均作答秒數（畫面取整）', '平均得分（未取整）', '平均作答秒數（未取整）'], widths: [22, 16, 15, 26, 31, 25, 28], rows: stats.map(r => [r.gameName, r.age, r.count, r.displayScore, r.displaySeconds, r.averageScore, r.averageSeconds]) },
      { name: '最近紀錄', headers, widths, rows: D.recent(records).map(row) },
      { name: '資料說明', headers: ['項目', '說明'], widths: [28, 110], note: true, rows: [
        ['展名', '心智大作戰'], ['匯出日期時間（UTC）', backup.exportedAt], ['匯出程式版本', backup.appVersion], ['備份格式版本', backup.schemaVersion], ['全部紀錄筆數', records.length],
        ['資料範圍', '匯出當下此瀏覽器的全部已完成關卡紀錄；不是僅限畫面最近 10 筆。'],
        ['統計單位', '每列是一人完成一次關卡；遊玩次數不代表獨立參與人數，同名也不保證是同一人。'],
        ['得分', '既有遊戲儲存的本關平均得分。保留原值；不同關卡的計分方式可能不同。'],
        ['作答秒數', '遊戲既有的作答計時值，非停留在網頁的時間；展示、倒數與回饋的計時範圍由各關原有規則決定。'],
        ['年齡', '玩家選取的年齡區間，未收集精確年齡。空值在趨勢分析中依既有規則歸為「未知」。'],
        ['英雄榜', '各已註冊關卡前 5 名：分數高者優先、同分作答秒數短者優先，再依原始時間字串降序。沿用畫面規則；同名可多次上榜。'],
        ['趨勢分析', '依關卡與年齡區間分組的彙總，並非逐日時間序列。畫面欄位四捨五入，另保留未取整的數值供研究計算。'],
        ['平均時間缺值處理', '沿用目前畫面：缺少作答秒數的紀錄以 0 累加，分母仍為全部遊玩次數；原始表中缺值留白，可另行篩選分析。'],
        ['最近紀錄及合併順序', '依瀏覽器儲存順序反向取最後 10 筆。合併時新匯入的紀錄附加在後；並非依日期解析排序。'],
        ['日期時間', '舊紀錄保留瀏覽器產生的原始時間字串，不推測日期格式或時區。新版完成時間另存 ISO 8601 UTC。'],
        ['識別碼', '識別一次遊玩，不是玩家代碼。舊資料依內容及相同內容的出現次數建立固定碼；新資料使用隨機碼。'],
        ['研究範圍', '既有資料沒有逐題答案、逐題反應時間、穩定參與者代碼或當時遊戲設定；不能由匯出資料補回。紀錄版本空白表示舊資料未保存。'],
        ['快照', '所有表格是匯出當下的數值快照；編輯原始表不會自動重算其他表。'],
        ['還原方式', '在遊玩紀錄中選「匯入備份」，選擇原始 ZIP 或完整備份.json；Excel 編輯不會改動 JSON，Excel 不用於還原。'],
        ['完整備份', 'JSON 保存全部原始紀錄欄位。Excel 為方便分析只列出指定欄位。備份不更改音效、玩家選擇或遊戲設定。']
      ] }
    ];
  }
  async function create(backup) {
    const sheets = buildSheets(backup), zip = new root.JSZip();
    zip.file('[Content_Types].xml', doc(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`));
    zip.file('_rels/.rels', doc(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`));
    zip.file('xl/workbook.xml', doc(`<workbook xmlns="${NS}" xmlns:r="${REL}"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`));
    zip.file('xl/_rels/workbook.xml.rels', doc(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`));
    zip.file('xl/styles.xml', doc(`<styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="11"/><color rgb="FF153454"/><name val="Microsoft JhengHei"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft JhengHei"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF153454"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`));
    sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXML(s)));
    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }
  root.BrainRecordsWorkbook = { create, buildSheets };
})(window);
