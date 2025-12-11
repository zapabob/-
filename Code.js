
/* 
  このファイルの内容をGoogle Apps Scriptのスクリプトエディタ（Code.gs）にコピーしてください。
  その後、「デプロイ」>「新しいデプロイ」>「ウェブアプリ」としてデプロイするか、
  スプレッドシートのメニューからサイドバーとして表示するスクリプトを追加してください。
*/

function doGet() {
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('大掃除マスター')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('大掃除マスター')
      .addItem('アプリを開く', 'showSidebar')
      .addToUi();
}

function showSidebar() {
  const html = HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('大掃除マスター');
  SpreadsheetApp.getUi().showSidebar(html);
}

// データを保存するシート名
const SHEET_NAME = 'CleaningTasks';

function getTasksFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return JSON.stringify([]);
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return JSON.stringify([]);
  }
  
  // 1行目はヘッダーと仮定
  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  
  const tasks = data.map(row => ({
    id: row[0].toString(),
    no: row[1],
    location: row[2],
    category: row[3],
    details: row[4],
    tools: row[5],
    assignee: row[6],
    isCompleted: row[7] === true || row[7] === 'TRUE',
    resultImage: null // シートには画像を直接保存しない（容量制限のため）
  }));
  
  return JSON.stringify(tasks);
}

function saveTasksToSheet(jsonString) {
  const tasks = JSON.parse(jsonString);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // ヘッダーを追加
    sheet.appendRow(['ID', 'No', '場所', '内容', '詳細', '道具', '担当', '完了']);
  }
  
  // 既存データをクリア（ヘッダー以外）
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  }
  
  if (tasks.length === 0) return "Saved";
  
  const rows = tasks.map(t => [
    t.id,
    t.no,
    t.location,
    t.category,
    t.details,
    t.tools,
    t.assignee,
    t.isCompleted
  ]);
  
  sheet.getRange(2, 1, rows.length, 8).setValues(rows);
  return "Saved";
}
