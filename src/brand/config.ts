// Editorial copy, story order and presentation-only fixtures. Never sent to workspace APIs.
export const cover = {
  position: '帕金森動作量測與研究輔助工具',
  title: ['讓每一次量測，', '都有清楚的脈絡。'],
  description: '整理動作量測、背景自述與歷次紀錄。看見資料的變化，也看清每項數值的計算方式與限制。',
  enter: '進入分析工作台',
  steps: [
    { id: 'record', number: '01', en: 'RECORD', title: '從紀錄開始', description: '左右交替量測，補上當時的背景。保留原始事件、時間與輸入條件，讓每次操作都有跡可循。' },
    { id: 'compare', number: '02', en: 'COMPARE', title: '把變化放在一起看', description: '將歷次觀測放回時間軸。選取紀錄、查看數值與條件，只有相容的量測才描述差異。' },
    { id: 'trace', number: '03', en: 'UNDERSTAND', title: '每個結果，都能查看依據', description: '從輸入、品質到計算公式，逐項展開查看。研究證據尚未資格化的部分，清楚保留限制。' },
  ],
} as const

export const illustrationRecords = [
  { id: 'A', day: '09.01', rate: '2.40', x: 60, y: 112 },
  { id: 'B', day: '09.04', rate: '2.65', x: 210, y: 64 },
  { id: 'C', day: '09.07', rate: '2.30', x: 360, y: 132 },
] as const
