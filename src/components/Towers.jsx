import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { hasLineOfSight } from '../maze/mazeGenerator'

const FIRE_RANGE    = 15
const FIRE_INTERVAL = 2.5
const BOLT_DURATION = 0.35
const HIT_DAMAGE    = 20
const MAX_BOLTS     = 6

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

  const boltMeshes  = useRef([])
  const activeBolts = useRef([])
  const audioCtxRef    = useRef(null)
  const audioBufferRef = useRef(null)
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
      if (t - b.startTime > BOLT_DURATION) {
        const mesh = boltMeshes.current[b.meshIndex]
        if (mesh) mesh.visible = false
      } else {
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
      outer: for (let j = 0; j < boltMeshes.current.length; j++) {
        for (let k = 0; k < activeBolts.current.length; k++) {
          if (activeBolts.current[k].meshIndex === j) continue outer
        }
        freeIndex = j
        break
      }
      if (freeIndex === -1) return

      const mesh = boltMeshes.current[freeIndex]
      if (mesh) {
        _from.current.set(tower.x, towerHeight * 0.9, tower.z)
        _to.current.set(pos.x, pos.y, pos.z)
        _dir.current.subVectors(_to.current, _from.current)
        const length = _dir.current.length()
        _mid.current.addVectors(_from.current, _to.current).multiplyScalar(0.5)
        _quat.current.setFromUnitVectors(_up.current, _dir.current.normalize())

        mesh.position.copy(_mid.current)
        mesh.quaternion.copy(_quat.current)
        mesh.scale.set(1, length, 1)
        mesh.visible = true

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
          key={`bolt-${i}`}
          ref={el => { boltMeshes.current[i] = el }}
          visible={false}
        >
          <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
          <meshStandardMaterial
            color='#ff4500'
            emissive='#ff4500'
            emissiveIntensity={4}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  )
}

