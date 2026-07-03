import { useEffect, useRef } from 'react'

export default function BackgroundMusic({ url = '/sounds/bg.ogg', volume = 0.4 }) {
  const audioRef = useRef(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const audio = new Audio(url)
    audio.loop = true
    audio.volume = volume
    audioRef.current = audio

    const start = () => {
      if (startedRef.current) return
      startedRef.current = true
      audio.play().catch((err) => {
        console.warn('Background music autoplay blocked:', err)
      })
    }

    document.addEventListener('pointerlockchange', start)

    return () => {
      document.removeEventListener('pointerlockchange', start)
      audio.pause()
      audio.src = ''
    }
  }, [url, volume])

  return null
}
