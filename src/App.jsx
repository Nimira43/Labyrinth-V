import { Canvas } from '@react-three/fiber'

import Maze from './components/Maze'
import Player from './components/Player'
import { generateMaze } from './maze/mazeGenerator'

export default function App() {
  const cellSize = 3
  const wallThickness = 0.3
  const width = 30
  const height = 30

  const { cells, exitCell } = generateMaze(width, height, 0.2)

  const offsetX = -(width * cellSize) / 2
  const offsetZ = -(height * cellSize) / 2

  return (
    <Canvas camera={{ position: [0, 1.6, 0], fov: 80 }}>
      <color attach='background' args={['#3b87e3']} /> {/* soft sky blue */}
      <fog attach='fog' args={['#b8d8ff', 30, 180]} /> {/* lighter fog */}

      <ambientLight intensity={0.8} /> {/* brighter base light */}
      <directionalLight position={[15, 30, 10]} intensity={1.2} color='#ffffff' />
      <hemisphereLight skyColor='#cfe8ff' groundColor='#e0d7c3' intensity={0.6} />

      <Maze
        width={width}
        height={height}
        cells={cells}
        exitCell={exitCell}
        cellSize={cellSize}
        wallThickness={wallThickness}
        offsetX={offsetX}
        offsetZ={offsetZ}
      />

      <Player
        mazeGrid={cells}
        exitCell={exitCell}
        cellSize={cellSize}
        offsetX={offsetX}
        offsetZ={offsetZ}
      />
    </Canvas>
  )
}






