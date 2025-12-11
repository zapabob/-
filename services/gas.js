
// Google Apps Script環境かどうかを判定
export const isGASEnvironment = () => {
  return typeof window !== 'undefined' && 
         window.google && 
         window.google.script && 
         window.google.script.run;
};

// シートからデータを読み込む
export const loadDataFromSheet = () => {
  return new Promise((resolve, reject) => {
    if (!isGASEnvironment()) {
        reject("Not in GAS environment"); 
        return;
    }
    window.google.script.run
      .withSuccessHandler((data) => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve([]); // Parse error or empty
        }
      })
      .withFailureHandler(reject)
      .getTasksFromSheet();
  });
};

// シートへデータを保存する
export const saveDataToSheet = (tasks) => {
  return new Promise((resolve, reject) => {
    if (!isGASEnvironment()) {
        resolve();
        return;
    }
    // 画像データが大きすぎる場合の問題を回避するため、必要に応じて処理を入れる
    // ここではそのまま送りますが、GAS側で制限にかかる可能性があります
    const dataString = JSON.stringify(tasks);
    window.google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      .saveTasksToSheet(dataString);
  });
};
