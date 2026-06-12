import { useCallback, useRef } from 'react'

export const SOUNDS = [
  { id: 'chime',    label: 'Chime'  },
  { id: 'ping',     label: 'Ping'   },
  { id: 'blip',     label: 'Blip'   },
  { id: 'two-tone', label: '2-Tone' },
  { id: 'pulse',    label: 'Pulse'  },
]

function synthesize(ctx, soundId) {
  const gain = ctx.createGain()
  gain.connect(ctx.destination)

  if (soundId === 'chime') {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4)
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.connect(gain)
    osc.start(); osc.stop(ctx.currentTime + 0.5)
  } else if (soundId === 'ping') {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 1200
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.connect(gain)
    osc.start(); osc.stop(ctx.currentTime + 0.15)
  } else if (soundId === 'blip') {
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = 600
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
    osc.connect(gain)
    osc.start(); osc.stop(ctx.currentTime + 0.08)
  } else if (soundId === 'two-tone') {
    for (const [freq, delay] of [[660, 0], [880, 0.15]]) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, ctx.currentTime + delay)
      g.gain.linearRampToValueAtTime(0.35, ctx.currentTime + delay + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.2)
    }
  } else if (soundId === 'pulse') {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 200
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.15)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.connect(gain)
    osc.start(); osc.stop(ctx.currentTime + 0.3)
  }
}

export function useAudio(projectId) {
  const ctxRef = useRef(null)

  function getPrefs() {
    try { return JSON.parse(localStorage.getItem(`audio-${projectId}`) || '{}') }
    catch { return {} }
  }

  function savePrefs(prefs) {
    localStorage.setItem(`audio-${projectId}`, JSON.stringify(prefs))
  }

  const play = useCallback((soundId) => {
    const prefs = getPrefs()
    if (prefs.enabled === false) return
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    synthesize(ctxRef.current, soundId || prefs.sound || 'chime')
  }, [projectId])

  return { play, getPrefs, savePrefs }
}
