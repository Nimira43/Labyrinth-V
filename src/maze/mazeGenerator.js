// Wall bitmask flags
const TOP = 0b0001
const RIGHT = 0b0010
const BOTTOM = 0b0100
const LEFT = 0b1000
const VISITED = 0b10000

export function generateMaze(width, height, extraPassages = 0.15) {
  // Flat Uint8Array — far cheaper than nested objects at 200×200
  const grid = new Uint8Array(width * height).fill(TOP | RIGHT | BOTTOM | LEFT)
  const idx = (x, y) => y * width + x

  const removeWall = (ax, ay, dir) => {
    if (dir === TOP) { grid[idx(ax, ay)] &= ~TOP; grid[idx(ax, ay - 1)] &= ~BOTTOM; }
    if (dir === BOTTOM) { grid[idx(ax, ay)] &= ~BOTTOM; grid[idx(ax, ay + 1)] &= ~TOP; }
    if (dir === RIGHT) { grid[idx(ax, ay)] &= ~RIGHT; grid[idx(ax + 1, ay)] &= ~LEFT; }
    if (dir === LEFT) { grid[idx(ax, ay)] &= ~LEFT; grid[idx(ax - 1, ay)] &= ~RIGHT; }
  };

  // Iterative DFS
  const stack = [0] 
  grid[0] |= VISITED 
  let visited = 1 
  const total = width * height 

  while (visited < total) {
    const top = stack[stack.length - 1] 
    const cx = top % width 
    const cy = Math.floor(top / width) 

    const neighbours = [] 
    if (cy > 0 && !(grid[idx(cx, cy - 1)] & VISITED)) neighbours.push(TOP) 
    if (cx < width - 1 && !(grid[idx(cx + 1, cy)] & VISITED)) neighbours.push(RIGHT) 
    if (cy < height - 1 && !(grid[idx(cx, cy + 1)] & VISITED)) neighbours.push(BOTTOM) 
    if (cx > 0 && !(grid[idx(cx - 1, cy)] & VISITED)) neighbours.push(LEFT) 

    if (neighbours.length === 0) {
      stack.pop() 
    } else {
      const dir = neighbours[Math.floor(Math.random() * neighbours.length)] 
      removeWall(cx, cy, dir) 
      let nx = cx, ny = cy 
      if (dir === TOP) ny-- 
      if (dir === BOTTOM) ny++ 
      if (dir === RIGHT) nx++ 
      if (dir === LEFT) nx-- 
      grid[idx(nx, ny)] |= VISITED 
      stack.push(idx(nx, ny)) 
      visited++ 
    }
  }

  // Extra passages
  const extras = Math.floor(width * height * extraPassages)
  for (let i = 0; i < extras; i++) {
    const x = Math.floor(Math.random() * width)
    const y = Math.floor(Math.random() * height)
    const dirs = []

    if (y > 0) dirs.push(TOP)
    if (x < width - 1) dirs.push(RIGHT)
    if (y < height - 1) dirs.push(BOTTOM)
    if (x > 0) dirs.push(LEFT)
    
    const dir = dirs[Math.floor(Math.random() * dirs.length)]
    if (grid[idx(x, y)] & dir) removeWall(x, y, dir)
  }

  // Convert to the cell object format the rest of the app expects
  const cells = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      const v = grid[idx(x, y)]
      row.push({
        x, y,
        walls: {
          top: !!(v & TOP),
          right: !!(v & RIGHT),
          bottom: !!(v & BOTTOM),
          left: !!(v & LEFT),
        }
      })
    }
    cells.push(row)
  }

  const exitCell = cells[height - 1][width - 1]
  return { cells, exitCell }
}

export function getNearbyWalls(cells, worldX, worldZ, cellSize, offsetX, offsetZ) {
  const width = cells[0].length
  const height = cells.length
  const T = 0.3

  const cx = Math.floor((worldX - offsetX) / cellSize + 0.5)
  const cz = Math.floor((worldZ - offsetZ) / cellSize + 0.5)

  const walls = []

  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const gx = cx + dx
      const gz = cz + dz
      if (gz < 0 || gz >= height || gx < 0 || gx >= width) continue

      const cell = cells[gz][gx]
      const wx = gx * cellSize + offsetX
      const wz = gz * cellSize + offsetZ

      if (cell.walls.top)
        walls.push({
          minX: wx - cellSize / 2,
          maxX: wx + cellSize / 2,
          minZ: wz - cellSize / 2 - T,
          maxZ: wz - cellSize / 2 + T
        })
      
      if (cell.walls.bottom)
        walls.push({
          minX: wx - cellSize / 2,
          maxX: wx + cellSize / 2,
          minZ: wz + cellSize / 2 - T,
          maxZ: wz + cellSize / 2 + T
        })
      
      if (cell.walls.left)
        walls.push({
          minX: wx - cellSize / 2 - T,
          maxX: wx - cellSize / 2 + T,
          minZ: wz - cellSize / 2,
          maxZ: wz + cellSize / 2
        })
      
      if (cell.walls.right)
        walls.push({
          minX: wx + cellSize / 2 - T,
          maxX: wx + cellSize / 2 + T,
          minZ: wz - cellSize / 2,
          maxZ: wz + cellSize / 2
        })
    }
  }
  return walls
}









