import React, { useState, useEffect } from 'react';
import { Plus, Wand2, Trash2, CheckSquare, Download, RotateCcw, Save, Loader2 } from 'lucide-react';
import { generateCleaningTask } from './services/gemini';
import { PhotoUpload } from './components/PhotoUpload';
import { isGASEnvironment, loadDataFromSheet, saveDataToSheet } from './services/gas';

// Helper for ID generation (fallback for non-secure contexts)
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Initial dummy data
const INITIAL_TASKS = [
  {
    id: '1',
    no: 1,
    location: 'キッチン',
    category: '整頓',
    details: '導線を冷やす（冷蔵庫周りなど）',
    tools: '画像参照',
    assignee: '田中',
    isCompleted: false,
    resultImage: null,
  },
  {
    id: '2',
    no: 2,
    location: 'お風呂',
    category: 'カビ取り',
    details: '排水溝とパッキンの漂白',
    tools: 'カビキラー, ブラシ',
    assignee: '',
    isCompleted: false,
    resultImage: null,
  },
];

const STORAGE_KEY = 'osouji-master-data-v1';

export default function App() {
  const isGAS = isGASEnvironment();
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize state
  const [tasks, setTasks] = useState(() => {
    // If running in GAS, start empty (will load in useEffect). 
    // If local, try LocalStorage.
    if (isGAS) return [];

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse saved data", e);
        }
      }
    }
    return INITIAL_TASKS;
  });

  const [loadingId, setLoadingId] = useState(null);

  // Load data for GAS
  useEffect(() => {
    if (isGAS) {
      setIsSyncing(true);
      loadDataFromSheet()
        .then((data) => {
          if (data && Array.isArray(data) && data.length > 0) {
            setTasks(data);
          } else {
            // If sheet is empty, use initial tasks? Or just keep empty.
            // Let's keep empty to respect the sheet state.
          }
        })
        .catch(err => console.error(err))
        .finally(() => setIsSyncing(false));
    }
  }, [isGAS]);

  // Auto-save to LocalStorage (Only if NOT in GAS)
  useEffect(() => {
    if (!isGAS) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks, isGAS]);

  // GAS Manual Save
  const handleSaveToSheet = async () => {
    setIsSyncing(true);
    try {
      await saveDataToSheet(tasks);
      alert("スプレッドシートに保存しました");
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setIsSyncing(false);
    }
  };

  // Add a new empty row
  const addTask = () => {
    const newTask = {
      id: generateId(),
      no: tasks.length + 1,
      location: '',
      category: '',
      details: '',
      tools: '',
      assignee: '',
      isCompleted: false,
      resultImage: null,
    };
    setTasks([...tasks, newTask]);
  };

  // Delete a row
  const deleteTask = (id) => {
    if (confirm('この行を削除しますか？')) {
      const filtered = tasks.filter(t => t.id !== id);
      // Re-numbering
      const renumbered = filtered.map((t, index) => ({ ...t, no: index + 1 }));
      setTasks(renumbered);
    }
  };

  // Update a field in a row
  const updateTask = (id, field, value) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  // AI Auto-fill handler
  const handleAiFill = async (id, location) => {
    if (!location.trim()) {
      alert("場所を入力してください");
      return;
    }
    
    setLoadingId(id);
    try {
      const suggestion = await generateCleaningTask(location);
      setTasks(prev => prev.map(t => {
        if (t.id === id) {
          return {
            ...t,
            category: suggestion.category,
            details: suggestion.details,
            tools: suggestion.tools,
          };
        }
        return t;
      }));
    } catch (e) {
      console.error(e);
      alert("AI提案に失敗しました。もう一度お試しください。");
    } finally {
      setLoadingId(null);
    }
  };

  // Export to CSV (Only for Local Mode)
  const handleExportCSV = () => {
    const BOM = '\uFEFF';
    const headers = ['No.', '場所', '内容', '詳細', '道具', '担当', '完了ステータス'];
    
    const csvRows = tasks.map(t => {
      return [
        t.no,
        `"${(t.location || '').replace(/"/g, '""')}"`,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        `"${(t.details || '').replace(/"/g, '""')}"`,
        `"${(t.tools || '').replace(/"/g, '""')}"`,
        `"${(t.assignee || '').replace(/"/g, '""')}"`,
        t.isCompleted ? '完了' : '未完了'
      ].join(',');
    });

    const csvString = BOM + headers.join(',') + '\n' + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `大掃除リスト_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset Data
  const handleReset = () => {
    if (confirm('全てのデータを削除し、初期状態に戻しますか？')) {
      if (!isGAS) {
        localStorage.removeItem(STORAGE_KEY);
      }
      setTasks(INITIAL_TASKS);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <CheckSquare size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                大掃除マスター {isGAS && <span className="text-sm font-normal text-green-600 ml-2">(Sheets連携中)</span>}
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                {isGAS ? 'スプレッドシートと連携しています' : 'ブラウザに自動保存されます'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
             {!isGAS && (
               <button 
                onClick={handleReset}
                className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                title="データをリセット"
              >
                <RotateCcw size={16} />
                <span className="hidden sm:inline">リセット</span>
              </button>
             )}

            {isGAS ? (
              <button 
                onClick={handleSaveToSheet}
                disabled={isSyncing}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
                title="スプレッドシートに保存"
              >
                {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span className="hidden sm:inline">シートに保存</span>
              </button>
            ) : (
              <button 
                onClick={handleExportCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 text-sm font-medium transition-colors"
                title="CSV形式でダウンロード"
              >
                <Download size={16} />
                <span className="hidden sm:inline">CSV保存</span>
              </button>
            )}

            <button 
              onClick={addTask}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 text-sm font-medium transition-colors ml-auto sm:ml-0"
            >
              <Plus size={18} />
              <span>行を追加</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[98%] mx-auto mt-6 px-2">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
          
          {/* Table Container for horizontal scroll */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700 text-sm border-b-2 border-gray-300">
                  <th className="p-3 w-12 text-center font-bold border-r border-gray-200 sticky left-0 bg-gray-50 z-10">
                    No.
                  </th>
                  <th className="p-3 w-48 text-left font-bold border-r border-gray-200">
                    大掃除場所
                  </th>
                  <th className="p-3 w-32 text-left font-bold border-r border-gray-200">
                    内容
                  </th>
                  <th className="p-3 w-64 text-left font-bold border-r border-gray-200">
                    内容詳細
                  </th>
                  <th className="p-3 w-48 text-left font-bold border-r border-gray-200">
                    使用するもの
                  </th>
                  <th className="p-3 w-28 text-left font-bold border-r border-gray-200">
                    担当
                  </th>
                  <th className="p-3 w-28 text-center font-bold border-r border-gray-200 bg-green-50 text-green-800">
                    結果写真
                  </th>
                  <th className="p-3 w-16 text-center font-bold">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr 
                    key={task.id} 
                    className={`group hover:bg-blue-50 transition-colors ${task.isCompleted ? 'bg-gray-50' : 'bg-white'}`}
                  >
                    {/* No. Column */}
                    <td className="p-2 text-center font-mono text-gray-500 border-r border-gray-200 sticky left-0 bg-white group-hover:bg-blue-50 z-10">
                      <div className="flex flex-col items-center justify-center">
                        <span className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center text-xs">
                          {task.no}
                        </span>
                      </div>
                    </td>

                    {/* Location Column */}
                    <td className="p-0 border-r border-gray-200 relative">
                      <div className="flex h-full">
                        <input 
                          type="text" 
                          value={task.location}
                          onChange={(e) => updateTask(task.id, 'location', e.target.value)}
                          placeholder="例: キッチン"
                          className="w-full h-full p-3 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-400"
                        />
                        <button
                          onClick={() => handleAiFill(task.id, task.location)}
                          disabled={!task.location || loadingId === task.id}
                          className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all ${
                            task.location 
                              ? 'text-purple-600 hover:bg-purple-100 cursor-pointer' 
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title="AIで詳細を提案"
                        >
                          {loadingId === task.id ? (
                            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Wand2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Category Column */}
                    <td className="p-0 border-r border-gray-200">
                      <input 
                        type="text" 
                        value={task.category}
                        onChange={(e) => updateTask(task.id, 'category', e.target.value)}
                        placeholder="整理整頓"
                        className="w-full h-full p-3 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-400"
                      />
                    </td>

                    {/* Details Column */}
                    <td className="p-0 border-r border-gray-200">
                      <textarea 
                        value={task.details}
                        onChange={(e) => updateTask(task.id, 'details', e.target.value)}
                        placeholder="詳細を入力"
                        className="w-full h-full p-3 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-400 min-h-[60px] resize-none"
                      />
                    </td>

                    {/* Tools Column */}
                    <td className="p-0 border-r border-gray-200">
                      <input 
                        type="text" 
                        value={task.tools}
                        onChange={(e) => updateTask(task.id, 'tools', e.target.value)}
                        placeholder="洗剤, スポンジ..."
                        className="w-full h-full p-3 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-400"
                      />
                    </td>

                    {/* Assignee Column */}
                    <td className="p-0 border-r border-gray-200">
                      <input 
                        type="text" 
                        value={task.assignee}
                        onChange={(e) => updateTask(task.id, 'assignee', e.target.value)}
                        placeholder="誰？"
                        className="w-full h-full p-3 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-400 text-center"
                      />
                    </td>

                    {/* Result Photo Column */}
                    <td className="p-1 border-r border-gray-200 bg-green-50/30">
                      <PhotoUpload 
                        imageSrc={task.resultImage}
                        onImageChange={(base64) => {
                           updateTask(task.id, 'resultImage', base64);
                           // Auto-complete if photo is added
                           if (base64 && !task.isCompleted) {
                             updateTask(task.id, 'isCompleted', true);
                           }
                        }}
                      />
                      {isGAS && task.resultImage && <div className="text-[10px] text-red-500 text-center">※シートには保存されません</div>}
                    </td>

                    {/* Actions Column */}
                    <td className="p-2 text-center">
                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="行を削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                
                {/* Empty State Suggestion */}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      タスクがありません。「行を追加」ボタンを押して始めましょう。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer of Table */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between items-center text-sm text-gray-600">
            <div>
              合計: {tasks.length} 件 / 完了: {tasks.filter(t => t.isCompleted || t.resultImage).length} 件
            </div>
            <div className="flex gap-2">
               <div className="flex items-center gap-1">
                 <Wand2 size={14} className="text-purple-600" />
                 <span>AI自動入力可能</span>
               </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 sm:hidden">
        <button 
          onClick={addTask}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
}