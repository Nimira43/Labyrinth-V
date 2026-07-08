export default function Towers({ towers, towerHeight = 10 }) {
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
    </>
  )
}