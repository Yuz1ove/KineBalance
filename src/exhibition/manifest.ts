import type { SceneId } from '../types'

export type ChapterId =
  | 'rhythm'
  | 'medication'
  | 'motion'
  | 'dispense'
  | 'response'
  | 'pattern'
  | 'review'

export interface ChapterDefinition {
  id: ChapterId
  index: string
  nav: string
  title: string
  scene: SceneId
}

export const chapters: ChapterDefinition[] = [
  { id: 'rhythm', index: '00', nav: 'Rhythm', title: '照護的節律', scene: 'schedule' },
  { id: 'medication', index: '01', nav: 'Medication', title: '用藥是時間錨點', scene: 'schedule' },
  { id: 'motion', index: '02', nav: 'Motion Test', title: '20 秒動作快照', scene: 'tap' },
  { id: 'dispense', index: '03', nav: 'Verified Dispense', title: '經核對的實體發藥', scene: 'dispense' },
  { id: 'response', index: '04', nav: 'Response Window', title: '約 60 分鐘反應窗', scene: 'followup' },
  { id: 'pattern', index: '05', nav: 'Personal Pattern', title: '只看自己的長期軌跡', scene: 'trend' },
  { id: 'review', index: '06', nav: 'Human Review', title: '由人共同完成決策', scene: 'review' }
]

export const sceneToChapter: Record<SceneId, ChapterId> = {
  schedule: 'medication',
  tap: 'motion',
  dispense: 'dispense',
  followup: 'response',
  trend: 'pattern',
  review: 'review'
}

export const chapterForScene = (scene: SceneId) => sceneToChapter[scene]

export const sceneForChapter = (chapter: ChapterId) =>
  chapters.find((item) => item.id === chapter)?.scene ?? 'schedule'

export const isChapterId = (value: string): value is ChapterId =>
  chapters.some((chapter) => chapter.id === value)
