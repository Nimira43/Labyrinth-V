import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { hasLineOfSight } from '../maze/mazeGenerator'

const FIRE_RANGE      = 15
const FIRE_INTERVAL   = 2.5
const BOLT_DURATION   = 0.35
const HIT_DAMAGE      = 20
const MAX_BOLTS       = 6
const CORE_RADIUS   = 0.035
const GLOW_RADIUS   = 0.16
const CORE_COLOR    = '#fff3d6'
const GLOW_COLOR    = '#ff4500'

export default function Towers({
  towers,
  towerHeight = 10,
  cells,
  cellSize,
  offsetX,
  offsetZ,
  onHit,
  isActive = true,
}) {
  const { camera } = useThree()

  const lastFireTime = useRef(
    towers.map((_, i) => -(i * (FIRE_INTERVAL / Math.max(towers.length, 1))))
  )

  const boltCoreMeshes  = useRef([])
  const boltGlowMeshes  = useRef([])
  const boltCoreMats    = useRef([])
  const boltGlowMats    = useRef([])
  const activeBolts     = useRef([])
  const audioCtxRef     = useRef(null)
  const audioBufferRef  = useRef(null)
  const _from = useRef(new THREE.Vector3())
  const _to   = useRef(new THREE.Vector3())
  const _dir  = useRef(new THREE.Vector3())
  const _mid  = useRef(new THREE.Vector3())
  const _quat = useRef(new THREE.Quaternion())
  const _up   = useRef(new THREE.Vector3(0, 1, 0))
  const haloRefs = useRef([])

  useEffect(() => {
    const ctx = new AudioContext()
    audioCtxRef.current = ctx

    fetch('/sounds/beam.flac')
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => { audioBufferRef.current = decoded })
      .catch(err => console.warn('Beam audio load failed:', err))

    return () => ctx.close()
  }, [])

  const playBeam = () => {
    const ctx = audioCtxRef.current
    const buf = audioBufferRef.current

    if (!ctx || !buf) return
    if (ctx.state === 'suspended') ctx.resume()

    const source = ctx.createBufferSource()
    source.buffer = buf
    source.connect(ctx.destination)
    source.start(0)
  }

  useFrame(({ clock }) => {
    const t   = clock.getElapsedTime()
    const pos = camera.position

    let writeIdx = 0
    for (let i = 0; i < activeBolts.current.length; i++) {
      const b = activeBolts.current[i]
      const life = (t - b.startTime) / BOLT_DURATION

      if (life > 1) {
        const coreMesh = boltCoreMeshes.current[b.meshIndex]
        const glowMesh = boltGlowMeshes.current[b.meshIndex]
        if (coreMesh) coreMesh.visible = false
        if (glowMesh) glowMesh.visible = false
      } else {
        const envelope = Math.sin(Math.PI * Math.min(Math.max(life, 0), 1))

        const coreMat = boltCoreMats.current[b.meshIndex]
        const glowMat = boltGlowMats.current[b.meshIndex]

        if (coreMat) {
          coreMat.opacity = 0.9 * envelope
          coreMat.emissiveIntensity = 3 + envelope * 3
        }
        if (glowMat) {
          const shimmer = 0.85 + Math.random() * 0.3
          glowMat.opacity = 0.45 * envelope * shimmer
          glowMat.emissiveIntensity = 1.5 + envelope * 1.5
        }

        activeBolts.current[writeIdx++] = b
      }
    }
    activeBolts.current.length = writeIdx

    let frameDamage = 0

    towers.forEach((tower, i) => {
      const dx   = pos.x - tower.x
      const dz   = pos.z - tower.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      const halo = haloRefs.current[i]

      if (halo?.material) {
        const proximity  = Math.max(0, 1 - dist / FIRE_RANGE)
        const pulseSpeed = 1 + proximity * 8
        halo.material.emissiveIntensity =
          1.5 + Math.sin(t * pulseSpeed * Math.PI * 2) * proximity * 1.5
      }

      if (!isActive) return
      if (t - lastFireTime.current[i] < FIRE_INTERVAL) return
      if (dist > FIRE_RANGE) return
      if (!hasLineOfSight(cells, tower.x, tower.z, pos.x, pos.z, cellSize, offsetX, offsetZ)) return

      lastFireTime.current[i] = t

      let freeIndex = -1
      outer: for (let j = 0; j < boltCoreMeshes.current.length; j++) {
        for (let k = 0; k < activeBolts.current.length; k++) {
          if (activeBolts.current[k].meshIndex === j) continue outer
        }
        freeIndex = j
        break
      }
      if (freeIndex === -1) return

      const coreMesh = boltCoreMeshes.current[freeIndex]
      const glowMesh = boltGlowMeshes.current[freeIndex]

      if (coreMesh && glowMesh) {
        _from.current.set(tower.x, towerHeight * 0.9, tower.z)
        _to.current.set(pos.x, pos.y, pos.z)
        _dir.current.subVectors(_to.current, _from.current)
        const length = _dir.current.length()
        _mid.current.addVectors(_from.current, _to.current).multiplyScalar(0.5)
        _quat.current.setFromUnitVectors(_up.current, _dir.current.normalize())

        coreMesh.position.copy(_mid.current)
        coreMesh.quaternion.copy(_quat.current)
        coreMesh.scale.set(1, length, 1)
        coreMesh.visible = true

        glowMesh.position.copy(_mid.current)
        glowMesh.quaternion.copy(_quat.current)
        glowMesh.scale.set(1, length, 1)
        glowMesh.visible = true

        activeBolts.current.push({
          meshIndex: freeIndex,
          startTime: t
        })
      }

      frameDamage += HIT_DAMAGE
      playBeam()
    })
    if (frameDamage > 0) {
      setTimeout(() => onHit?.(frameDamage), 0)
    }
  })

  if (!towers.length) return null

  return (
    <>
      {towers.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>

          <mesh position={[0, towerHeight / 2, 0]}>
            <cylinderGeometry args={[0.55, 0.7, towerHeight, 16]} />
            <meshStandardMaterial
              color='#1a1d21'
              roughness={0.4}
              metalness={0.8}
            />
          </mesh>

          <mesh
            ref={el => { haloRefs.current[i] = el }}
            position={[0, towerHeight + 0.15, 0]}
          >
            <torusGeometry args={[0.5, 0.08, 12, 24]} />
            <meshStandardMaterial
              color='#ff4500'
              emissive='#ff4500'
              emissiveIntensity={1.5}
            />
          </mesh>

        </group>
      ))}

      {Array.from({ length: MAX_BOLTS }, (_, i) => (
        <mesh
          key={`bolt-glow-${i}`}
          ref={el => { boltGlowMeshes.current[i] = el }}
          visible={false}
        >
          <cylinderGeometry args={[GLOW_RADIUS, GLOW_RADIUS, 1, 8]} />
          <meshStandardMaterial
            ref={el => { boltGlowMats.current[i] = el }}
            color={GLOW_COLOR}
            emissive={GLOW_COLOR}
            emissiveIntensity={1.5}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      {Array.from({ length: MAX_BOLTS }, (_, i) => (
        <mesh
          key={`bolt-core-${i}`}
          ref={el => { boltCoreMeshes.current[i] = el }}
          visible={false}
        >
          <cylinderGeometry args={[CORE_RADIUS, CORE_RADIUS, 1, 6]} />
          <meshStandardMaterial
            ref={el => { boltCoreMats.current[i] = el }}
            color={CORE_COLOR}
            emissive={CORE_COLOR}
            emissiveIntensity={4}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  )
}

