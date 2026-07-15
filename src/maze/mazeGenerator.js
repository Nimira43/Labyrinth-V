const TOP = 0b0001
const RIGHT = 0b0010
const BOTTOM = 0b0100
const LEFT = 0b1000
const VISITED = 0b10000

export function generateMaze(width, height, extraPassages = 0.15) {
  const grid = new Uint8Array(width * height).fill(TOP | RIGHT | BOTTOM | LEFT)
  const idx = (x, y) => y * width + x

  const removeWall = (ax, ay, dir) => {
    if (dir === TOP) {
      grid[idx(ax, ay)] &= ~TOP; grid[idx(ax, ay - 1)] &= ~BOTTOM;
    }

    if (dir === BOTTOM) {
      grid[idx(ax, ay)] &= ~BOTTOM; grid[idx(ax, ay + 1)] &= ~TOP;
    }

    if (dir === RIGHT) {
      grid[idx(ax, ay)] &= ~RIGHT; grid[idx(ax + 1, ay)] &= ~LEFT;
    }

    if (dir === LEFT) {
      grid[idx(ax, ay)] &= ~LEFT; grid[idx(ax - 1, ay)] &= ~RIGHT;
    }
  }

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

export function generateTowerPositions(width, height, count = 3) {
  const fractions = [
    { fx: 0.25, fz: 0.25 },
    { fx: 0.75, fz: 0.4  },
    { fx: 0.45, fz: 0.75 },
  ]
  return fractions.slice(0, count).map(({ fx, fz }) => ({
    x: Math.floor(width * fx),
    y: Math.floor(height * fz),
  }))
}

export function hasLineOfSight(cells, worldAX, worldAZ, worldBX, worldBZ, cellSize, offsetX, offsetZ) {
  const width = cells[0].length
  const height = cells.length
  const dist = Math.sqrt((worldBX - worldAX) ** 2 + (worldBZ - worldAZ) ** 2)
  const steps = Math.ceil(dist / (cellSize * 0.4))

  let prevCX = -1
  let prevCZ = -1

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const wx = worldAX + (worldBX - worldAX) * t
    const wz = worldAZ + (worldBZ - worldAZ) * t

    const cx = Math.floor((wx - offsetX) / cellSize + 0.5)
    const cz = Math.floor((wz - offsetZ) / cellSize + 0.5)

    if (cx < 0 || cx >= width || cz < 0 || cz >= height) {
      prevCX = cx; prevCZ = cz; continue
    }

    if (prevCX >= 0 && prevCZ >= 0 && (cx !== prevCX || cz !== prevCZ)) {
      const dcx = cx - prevCX
      const dcz = cz - prevCZ
      const prevCell = cells[prevCZ]?.[prevCX]

      if (prevCell) {
        if (dcx ===  1 && prevCell.walls.right) return false
        if (dcx === -1 && prevCell.walls.left) return false
        if (dcz ===  1 && prevCell.walls.bottom) return false
        if (dcz === -1 && prevCell.walls.top) return false
      }
    }

    prevCX = cx
    prevCZ = cz
  }

  return true
}

export function getNearbyWalls(cells, worldX, worldZ, cellSize, offsetX, offsetZ, T = 0.3) {
  const width = cells[0].length
  const height = cells.length

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
