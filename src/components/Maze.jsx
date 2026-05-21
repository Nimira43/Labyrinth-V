export default function Maze({
  width,
  height,
  cells,
  exitCell,
  cellSize,
  wallThickness,
  offsetX,
  offsetZ,
}) {
  const walls = [] 

  cells.forEach((row) => {
    row.forEach((cell) => {
      const { x, y, walls: w } = cell 
      const cx = x * cellSize 
      const cz = y * cellSize 
      const thickness = wallThickness 
      const wallHeight = 2.5 

      /// TOP wall (push outward in -Z)
      if (w.top)
        walls.push({
          key: `t-${x}-${y}`,
          position: [
            cx + offsetX,
            wallHeight / 2,
            cz - cellSize / 2 + offsetZ - thickness / 2
          ],
          args: [cellSize, wallHeight, thickness],
        }) 

      // BOTTOM wall (push outward in +Z)
      if (w.bottom)
        walls.push({
          key: `b-${x}-${y}`,
          position: [
            cx + offsetX,
            wallHeight / 2,
            cz + cellSize / 2 + offsetZ + thickness / 2
          ],
          args: [cellSize, wallHeight, thickness],
        }) 

      // LEFT wall (push outward in -X)
      if (w.left)
        walls.push({
          key: `l-${x}-${y}`,
          position: [
            cx - cellSize / 2 + offsetX - thickness / 2,
            wallHeight / 2,
            cz + offsetZ
          ],
          args: [thickness, wallHeight, cellSize],
        }) 

      // RIGHT wall (push outward in +X)
      if (w.right)
        walls.push({
          key: `r-${x}-${y}`,
          position: [
            cx + cellSize / 2 + offsetX + thickness / 2,
            wallHeight / 2,
            cz + offsetZ
          ],
          args: [thickness, wallHeight, cellSize],
        }) 
    }) 
  }) 

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[
          (width * cellSize) / 2 + offsetX,
          0,
          (height * cellSize) / 2 + offsetZ,
        ]}
      >
        <planeGeometry args={[width * cellSize, height * cellSize]} />
        <meshStandardMaterial color='#202020' />
      </mesh>

      {walls.map((w) => (
        <mesh key={w.key} position={w.position}>
          <boxGeometry args={w.args} />
          <meshStandardMaterial color='#cccccc' />
        </mesh>
      ))}

      <mesh
        position={[
          exitCell.x * cellSize + offsetX,
          1.2,
          exitCell.y * cellSize + offsetZ,
        ]}
      >
        <torusGeometry args={[0.8, 0.2, 16, 32]} />
        <meshStandardMaterial
          color='#00ffcc'
          emissive='#00ffcc'
          emissiveIntensity={1.4}
        />
      </mesh>
    </group>
  ) 
}

