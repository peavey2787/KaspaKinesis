'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  twinkle: number
  layer: number
  color: string
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const palette = ['#49eacb', '#a14bf2']

    const initParticles = () => {
      const area = window.innerWidth * window.innerHeight
      const particleCount = Math.min(140, Math.floor(area / 12000))
      particlesRef.current = []

      for (let i = 0; i < particleCount; i++) {
        const layer = Math.floor(Math.random() * 3)
        const speed = 0.08 + layer * 0.06
        const angle = Math.random() * Math.PI * 2
        const radius = layer === 0 ? Math.random() * 1.4 + 0.6 : layer === 1 ? Math.random() * 2.2 + 0.8 : Math.random() * 3.4 + 1.2
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius,
          opacity: 0.2 + Math.random() * 0.6,
          twinkle: Math.random() * Math.PI * 2,
          layer,
          color: palette[Math.floor(Math.random() * palette.length)],
        })
      }
    }

    let time = 0
    const drawStar = (x: number, y: number, size: number, alpha: number, color: string) => {
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
      ctx.fill()

      if (size > 2.4) {
        ctx.strokeStyle = `${color}${Math.floor(alpha * 180).toString(16).padStart(2, '0')}`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x - size * 2.2, y)
        ctx.lineTo(x + size * 2.2, y)
        ctx.moveTo(x, y - size * 2.2)
        ctx.lineTo(x, y + size * 2.2)
        ctx.stroke()
      }
    }

    const animate = () => {
      if (!ctx || !canvas) return

      time += 0.008
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const particles = particlesRef.current
      particles.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < -20) particle.x = canvas.width + 20
        if (particle.x > canvas.width + 20) particle.x = -20
        if (particle.y < -20) particle.y = canvas.height + 20
        if (particle.y > canvas.height + 20) particle.y = -20

        const twinkle = 0.5 + Math.sin(time * (1.5 + particle.layer) + particle.twinkle) * 0.5
        const alpha = particle.opacity * (0.6 + twinkle * 0.6)
        drawStar(particle.x, particle.y, particle.radius, alpha, particle.color)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    resizeCanvas()
    initParticles()
    animate()

    window.addEventListener('resize', () => {
      resizeCanvas()
      initParticles()
    })
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  )
}

export function BlockDAGBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    let time = 0

    const animate = () => {
      if (!ctx || !canvas) return
      time += 0.01

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'

      const ribbonCount = 7
      const baseSpacing = canvas.height / (ribbonCount + 1)

      for (let i = 0; i < ribbonCount; i++) {
        const amplitude = canvas.height * (0.03 + i * 0.005)
        const frequency = 2 + i * 0.4
        const speed = 0.6 + i * 0.12
        const offset = i * 0.9
        const yBase = baseSpacing * (i + 1)

        const gradient = ctx.createLinearGradient(0, yBase, canvas.width, yBase)
        gradient.addColorStop(0, 'rgba(73, 234, 203, 0)')
        gradient.addColorStop(0.4, 'rgba(73, 234, 203, 0.45)')
        gradient.addColorStop(0.6, 'rgba(161, 75, 242, 0.45)')
        gradient.addColorStop(1, 'rgba(161, 75, 242, 0)')

        ctx.beginPath()
        for (let x = 0; x <= canvas.width; x += 18) {
          const wave = Math.sin((x / canvas.width) * Math.PI * frequency + time * speed + offset) * amplitude
          const y = yBase + wave
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = gradient
        ctx.lineWidth = 1.2
        ctx.stroke()

        const pearlProgress = (time * 0.08 + i * 0.13) % 1
        const pearlX = pearlProgress * canvas.width
        const pearlWave = Math.sin((pearlX / canvas.width) * Math.PI * frequency + time * speed + offset) * amplitude
        const pearlY = yBase + pearlWave
        ctx.beginPath()
        ctx.arc(pearlX, pearlY, 2.2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(73, 234, 203, 0.9)'
        ctx.fill()
      }

      for (let i = 0; i < 5; i++) {
        const x = (time * 70 + i * 260) % (canvas.width + 260) - 130
        const barGradient = ctx.createLinearGradient(x, 0, x + 140, 0)
        barGradient.addColorStop(0, 'rgba(73, 234, 203, 0)')
        barGradient.addColorStop(0.5, 'rgba(73, 234, 203, 0.12)')
        barGradient.addColorStop(1, 'rgba(73, 234, 203, 0)')
        ctx.fillStyle = barGradient
        ctx.fillRect(x, 0, 140, canvas.height)
      }

      ctx.restore()
      animationRef.current = requestAnimationFrame(animate)
    }

    resizeCanvas()
    animate()

    window.addEventListener('resize', resizeCanvas)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-40"
    />
  )
}

export function GridBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-kaspa-primary/5 rounded-full blur-3xl" />
      </motion.div>
    </div>
  )
}
