import {
  Activity,
  ChartNoAxesCombined,
  Check,
  ClipboardCheck,
  Clock3,
  MousePointerClick,
  UsersRound
} from 'lucide-react'
import type { SceneId } from '../types'

export interface SceneDefinition {
  id: SceneId
  short: string
  title: string
}

interface SceneNavProps {
  scenes: SceneDefinition[]
  current: number
  visited: Set<SceneId>
  onSelect: (index: number) => void
}

export function SceneNav({ scenes, current, visited, onSelect }: SceneNavProps) {
  const sceneIcons: Record<SceneId, typeof Clock3> = {
    schedule: Clock3,
    tap: MousePointerClick,
    dispense: ClipboardCheck,
    followup: Activity,
    trend: ChartNoAxesCombined,
    review: UsersRound
  }

  return (
    <nav className="scene-nav" aria-label="六個體驗場景">
      <ol>
        {scenes.map((scene, index) => {
          const complete = visited.has(scene.id) && index !== current
          const Icon = sceneIcons[scene.id]
          return (
            <li key={scene.id}>
              <button
                className={index === current ? 'active' : ''}
                onClick={() => onSelect(index)}
                aria-current={index === current ? 'step' : undefined}
                aria-label={`前往場景：${scene.title}`}
              >
                <span className="step-number">
                  <Icon aria-hidden="true" />
                </span>
                <span>
                  <small>{scene.short}</small>
                  <strong>{scene.title}</strong>
                </span>
                {complete ? <Check className="visited-check" aria-label="已瀏覽" /> : null}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
