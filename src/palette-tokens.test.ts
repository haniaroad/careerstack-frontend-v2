import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const srcDir = dirname(fileURLToPath(import.meta.url))

function read(relativePath: string) {
  return readFileSync(join(srcDir, relativePath), 'utf8')
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return path.endsWith('.tsx') ? [path] : []
  })
}

function lightRoot(css: string) {
  const start = css.indexOf(':root {')
  const dark = css.indexOf('/* Future dark-mode')
  return css.slice(start, dark)
}

describe('marketing palette tokens', () => {
  const css = read('index.css')
  const light = lightRoot(css)

  it('maps the approved light-mode roles', () => {
    expect(light).toContain('--canvas: #f3efe7;')
    expect(light).toContain('--surface: #fbf8f3;')
    expect(light).toContain('--muted: #e7e0d4;')
    expect(light).toContain('--muted-foreground: #57534e;')
    expect(light).toContain('--ink-muted: #57534e;')
    expect(light).toContain('--ink: #1c1917;')
    expect(light).toContain('--border: #dcd3c4;')
    expect(light).toContain('--input: #57534e;')
    expect(light).toContain('--brand: #9a3412;')
    expect(light).toContain('--brand-foreground: #fbf8f3;')
    expect(light).toContain('--brand-hover: #c2410c;')
    expect(light).toContain('--brand-muted: #f8ebe3;')
    expect(light).toContain('--ring: #c2410c;')
    expect(light).toContain('--sidebar: #1c1917;')
    expect(light).toContain('--sidebar-muted: #e7e0d4;')
    expect(light).toContain('--status-success: #1f4d3a;')
    expect(light).toContain('--status-success-bg: #f1f7f4;')
    expect(light).toContain('--status-warning: #a16207;')
    expect(light).toContain('--status-danger: #b91c1c;')
    expect(light).toContain('--status-info: #1d4ed8;')
    expect(css).toContain('--color-ink-muted: var(--ink-muted);')
    expect(css).toContain('--color-brand-hover: var(--brand-hover);')
    expect(css).not.toContain('#4f46e5')
    expect(css).not.toContain('#818cf8')
  })

  it('recolors the auth gradient off legacy ember coral', () => {
    const layout = read('auth/AuthLayout.tsx')
    expect(layout).toContain('#c2410c')
    expect(layout).not.toContain('#ff6b4a')
  })

  it('gives outlined buttons and fields the stone control boundary', () => {
    const button = read('components/ui/button.tsx')
    expect(button).toMatch(/outline:\s*\n\s*"border border-input/)
    const signIn = read('pages/SignInPage.tsx')
    expect(signIn).toContain('border-input bg-surface')
    expect(signIn).not.toContain('border-border bg-surface text-ink')

    const offenders: string[] = []
    for (const file of walk(srcDir)) {
      const source = readFileSync(file, 'utf8')
      const tags = source.matchAll(/<(input|textarea|select)\b[\s\S]*?(?:\/>|>)/g)
      for (const tag of tags) {
        if (tag[0].includes('border-border')) offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })
})
