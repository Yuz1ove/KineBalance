import { useId, type ReactNode } from 'react'

interface SceneShellProps {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  aside?: ReactNode
}

export function SceneShell({
  eyebrow,
  title,
  description,
  children,
  aside
}: SceneShellProps) {
  const titleId = useId()
  return (
    <article className="scene" aria-labelledby={titleId}>
      <header className="scene-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 id={titleId}>{title}</h1>
          <p className="scene-description">{description}</p>
        </div>
        {aside ? <div className="scene-aside">{aside}</div> : null}
      </header>
      {children}
    </article>
  )
}
