import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const FIRE_RANGE    = 15    
const FIRE_INTERVAL = 2.5   
const BOLT_DURATION = 0.35 

function Bolt({ from, to }) {
  const dir    = new THREE.Vector3().subVectors(to, from)
  const length = dir.length()
  const mid    = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)

  const quaternion = new THREE.Quaternion()
  quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  )

  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.04, 0.04, length, 6]} />
      <meshStandardMaterial
        color='#ff4500'
        emissive='#ff4500'
        emissiveIntensity={4}
        toneMapped={false}
      />
    </mesh>
  )
}

export default function Towers({ towers, towerHeight = 10 }) {
  const { camera } = useThree()

  const lastFireTime = useRef(
    towers.map((_, i) => -(i * (FIRE_INTERVAL / Math.max(towers.length, 1))))
  )

  const [bolts, setBolts]   = useState([])
  const boltIdRef           = useRef(0)
  const beamAudioRef        = useRef(null)

  useEffect(() => {
    const audio = new Audio('/sounds/beam.flac')
    audio.volume = 0.6
    beamAudioRef.current = audio
  }, [])

  useFrame(({ clock }) => {
    const t   = clock.getElapsedTime()
    const pos = camera.position

    setBolts(prev => {
      const active = prev.filter(b => t - b.startTime < BOLT_DURATION)
      return active.length === prev.length ? prev : active
    })

    towers.forEach((tower, i) => {
      if (t - lastFireTime.current[i] < FIRE_INTERVAL) return

      const dx   = pos.x - tower.x
      const dz   = pos.z - tower.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist > FIRE_RANGE) return

      lastFireTime.current[i] = t

      const from = new THREE.Vector3(tower.x, towerHeight * 0.9, tower.z)
      const to   = new THREE.Vector3(pos.x, pos.y, pos.z)

      setBolts(prev => [...prev, {
        id:        boltIdRef.current++,
        from,
        to,
        startTime: t,
      }])

      if (beamAudioRef.current) {
        const clip = beamAudioRef.current.cloneNode()
        clip.volume = 0.6
        clip.play().catch(() => {})
      }
    })
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

          <mesh position={[0, towerHeight + 0.15, 0]}>
            <torusGeometry args={[0.5, 0.08, 12, 24]} />
            <meshStandardMaterial
              color='#ff4500'
              emissive='#ff4500'
              emissiveIntensity={1.5}
            />
          </mesh>

        </group>
      ))}

      {bolts.map(bolt => (
        <Bolt key={bolt.id} from={bolt.from} to={bolt.to} />
      ))}
    </>
  )
} 
