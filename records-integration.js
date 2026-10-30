/* Keep v10.7's original transfer UI and data pipeline in the workshop.
   Its DOM stays mounted when dialogs close, including during async exports. */
(function (root) {
  'use strict';
  root.renderModalData = function (records) {
    const el = document.getElementById('records-total');
    if (el) el.textContent = `目前共 ${records.length} 筆遊玩紀錄`;
  };
})(window);
