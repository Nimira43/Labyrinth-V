export function generateMaze(width, height, extraPassages = 0.15) {
  const cells = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      row.push({
        x,
        y,
        visited: false,
        walls: { top: true, right: true, bottom: true, left: true },
      })
    }
    cells.push(row)
  }

  const stack = []
  const start = cells[0][0]
  start.visited = true
  stack.push(start)

  const neighbours = (cell) => {
    const list = []
    const { x, y } = cell

    if (y > 0) list.push({
      dir: 'top', cell: cells[y - 1][x]
    })

    if (x < width - 1) list.push({
      dir: 'right', cell: cells[y][x + 1]
    })

    if (y < height - 1) list.push({
      dir: 'bottom', cell: cells[y + 1][x]
    })
    if (x > 0) list.push({
      dir: 'left', cell: cells[y][x - 1]
    })

    return list
  }

  const removeWall = (a, b, dir) => {
    a.walls[dir] = false

    if (dir === 'top') b.walls.bottom = false
    if (dir === 'right') b.walls.left = false
    if (dir === 'bottom') b.walls.top = false
    if (dir === 'left') b.walls.right = false
  }

  while (stack.length) {
    const current = stack[stack.length - 1]
    const unvisited = neighbours(current).filter((n) => !n.cell.visited)

    if (unvisited.length === 0) {
      stack.pop()
    } else {
      const next = unvisited[Math.floor(Math.random() * unvisited.length)]
      next.cell.visited = true
      removeWall(current, next.cell, next.dir)
      stack.push(next.cell)
    }
  }

  const totalCells = width * height
  const extraEdges = Math.floor(totalCells * extraPassages)

  for (let i = 0; i < extraEdges; i++) {
    const x = Math.floor(Math.random() * width)
    const y = Math.floor(Math.random() * height)
    const cell = cells[y][x]
    const neighs = neighbours(cell)
    if (!neighs.length) continue
    const { dir, cell: nCell } = neighs[Math.floor(Math.random() * neighs.length)]
    if (cell.walls[dir]) removeWall(cell, nCell, dir)
  }

  const exitCell = cells[height - 1][width - 1]
  return { cells, exitCell }
}

export function getNearbyWalls(cells, worldX, worldZ, cellSize, offsetX, offsetZ) {
  const width = cells[0].length
  const height = cells.length

  const cx = Math.floor((worldX - offsetX) / cellSize + 0.5)
  const cz = Math.floor((worldZ - offsetZ) / cellSize + 0.5)

  const walls = [];
  const T = 0.3; // wall thickness — keep in sync with Maze.jsx wallThickness

  // Check a 3×3 neighbourhood so corners are always covered
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const gx = cx + dx;
      const gz = cz + dz;
      if (gz < 0 || gz >= height || gx < 0 || gx >= width) continue;

      const cell = cells[gz][gx];
      const wx = gx * cellSize + offsetX;   // cell centre X
      const wz = gz * cellSize + offsetZ;   // cell centre Z

      // Each wall is pushed *outward* by thickness/2 from the cell edge,
      // matching exactly how Maze.jsx positions the boxes.
      
      if (cell.walls.top)
        walls.push({
          minX: wx - cellSize / 2, maxX: wx + cellSize / 2,
          minZ: wz - cellSize / 2 - T, maxZ: wz - cellSize / 2 + T,
        })
      
      if (cell.walls.bottom)
        walls.push({
          minX: wx - cellSize / 2, maxX: wx + cellSize / 2,
          minZ: wz + cellSize / 2 - T, maxZ: wz + cellSize / 2 + T,
        })
      if (cell.walls.left)
        walls.push({
          minX: wx - cellSize / 2 - T, maxX: wx - cellSize / 2 + T,
          minZ: wz - cellSize / 2, maxZ: wz + cellSize / 2,
        })
      
      if (cell.walls.right)
        walls.push({
          minX: wx + cellSize / 2 - T, maxX: wx + cellSize / 2 + T,
          minZ: wz - cellSize / 2, maxZ: wz + cellSize / 2,
        })
    }
  }
  return walls
}









