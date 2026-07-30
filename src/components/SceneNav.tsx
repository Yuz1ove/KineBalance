import { Check } from 'lucide-react'
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
  return (
    <nav className="scene-nav" aria-label="六個體驗場景">
      <ol>
        {scenes.map((scene, index) => {
          const complete = visited.has(scene.id) && index !== current
          return (
            <li key={scene.id}>
              <button
                className={index === current ? 'active' : ''}
                onClick={() => onSelect(index)}
                aria-current={index === current ? 'step' : undefined}
                aria-label={`前往場景：${scene.title}`}
              >
                <span className="step-number">
                  {complete ? <Check aria-label="已瀏覽" /> : String(index + 1).padStart(2, '0')}
                </span>
                <span>
                  <small>{scene.short}</small>
                  <strong>{scene.title}</strong>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
