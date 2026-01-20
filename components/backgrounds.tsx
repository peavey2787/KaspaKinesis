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
  connections: number[]
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const initParticles = () => {
      const particleCount = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 15000))
      particlesRef.current = []

      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          connections: [],
        })
      }
    }

    const animate = () => {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const particles = particlesRef.current
      const mouse = mouseRef.current

      // Update and draw particles
      particles.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

        // Mouse interaction
        const dx = mouse.x - particle.x
        const dy = mouse.y - particle.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150) {
          const force = (150 - dist) / 150
          particle.vx -= (dx / dist) * force * 0.02
          particle.vy -= (dy / dist) * force * 0.02
        }

        // Limit velocity
        const maxVel = 1
        const vel = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy)
        if (vel > maxVel) {
          particle.vx = (particle.vx / vel) * maxVel
          particle.vy = (particle.vy / vel) * maxVel
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 245, 255, ${particle.opacity})`
        ctx.fill()

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j]
          const dx = particle.x - other.x
          const dy = particle.y - other.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            const opacity = (1 - distance / 150) * 0.3
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(other.x, other.y)
            ctx.strokeStyle = `rgba(0, 245, 255, ${opacity})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    resizeCanvas()
    initParticles()
    animate()

    window.addEventListener('resize', () => {
      resizeCanvas()
      initParticles()
    })
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
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

    interface Node {
      x: number
      y: number
      targetX: number
      targetY: number
      radius: number
      connections: number[]
      pulsePhase: number
      layer: number
    }

    const nodes: Node[] = []
    const layers = 6
    const nodesPerLayer = 5

    const initNodes = () => {
      nodes.length = 0
      const layerHeight = canvas.height / (layers + 1)
      const layerWidth = canvas.width * 0.6
      const startX = canvas.width * 0.2

      for (let layer = 0; layer < layers; layer++) {
        for (let i = 0; i < nodesPerLayer; i++) {
          const x = startX + (layerWidth / (nodesPerLayer - 1)) * i + (Math.random() - 0.5) * 50
          const y = layerHeight * (layer + 1) + (Math.random() - 0.5) * 30
          nodes.push({
            x,
            y,
            targetX: x,
            targetY: y,
            radius: 4 + Math.random() * 4,
            connections: [],
            pulsePhase: Math.random() * Math.PI * 2,
            layer,
          })
        }
      }

      // Create DAG connections (only to previous layers)
      nodes.forEach((node, i) => {
        if (node.layer > 0) {
          const prevLayerStart = (node.layer - 1) * nodesPerLayer
          const connectionCount = 1 + Math.floor(Math.random() * 2)
          const availableNodes = []
          for (let j = prevLayerStart; j < prevLayerStart + nodesPerLayer; j++) {
            availableNodes.push(j)
          }
          for (let c = 0; c < connectionCount && availableNodes.length > 0; c++) {
            const idx = Math.floor(Math.random() * availableNodes.length)
            node.connections.push(availableNodes[idx])
            availableNodes.splice(idx, 1)
          }
        }
      })
    }

    let time = 0

    const animate = () => {
      if (!ctx || !canvas) return
      time += 0.01

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw connections with animated flow
      nodes.forEach((node) => {
        node.connections.forEach((targetIdx) => {
          const target = nodes[targetIdx]
          
          // Draw line
          const gradient = ctx.createLinearGradient(node.x, node.y, target.x, target.y)
          gradient.addColorStop(0, 'rgba(73, 234, 203, 0.2)')
          gradient.addColorStop(0.5, 'rgba(0, 245, 255, 0.4)')
          gradient.addColorStop(1, 'rgba(73, 234, 203, 0.2)')
          
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(target.x, target.y)
          ctx.strokeStyle = gradient
          ctx.lineWidth = 1
          ctx.stroke()

          // Animated particle along connection
          const particleProgress = (Math.sin(time * 2 + node.pulsePhase) + 1) / 2
          const px = node.x + (target.x - node.x) * particleProgress
          const py = node.y + (target.y - node.y) * particleProgress

          ctx.beginPath()
          ctx.arc(px, py, 2, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(0, 245, 255, 0.8)'
          ctx.fill()
        })
      })

      // Draw nodes
      nodes.forEach((node) => {
        const pulse = Math.sin(time * 2 + node.pulsePhase) * 0.3 + 0.7

        // Glow
        const glowGradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.radius * 3
        )
        glowGradient.addColorStop(0, `rgba(0, 245, 255, ${0.3 * pulse})`)
        glowGradient.addColorStop(1, 'rgba(0, 245, 255, 0)')
        
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2)
        ctx.fillStyle = glowGradient
        ctx.fill()

        // Node
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(73, 234, 203, ${0.6 + 0.4 * pulse})`
        ctx.fill()
        ctx.strokeStyle = 'rgba(0, 245, 255, 0.8)'
        ctx.lineWidth = 1
        ctx.stroke()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    resizeCanvas()
    initNodes()
    animate()

    window.addEventListener('resize', () => {
      resizeCanvas()
      initNodes()
    })

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
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
