const radius = .17;
const roomKinds = new Set(['living', 'dining', 'kitchen', 'elder', 'bedroom', 'bath', 'service']);

function inside(polygon, x, y) {
  let contained = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i], [bx, by] = polygon[j];
    if ((ay > y) !== (by > y) && x < ax + (y - ay) * (bx - ax) / (by - ay)) {
      contained = !contained;
    }
  }
  return contained;
}

function nearEdge(polygon, x, y) {
  return polygon.some(([ax, ay], i) => {
    const [bx, by] = polygon[(i + 1) % polygon.length];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    return (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2 < radius ** 2;
  });
}

function nearRect([left, bottom, width, depth], x, y) {
  const dx = Math.max(left - x, 0, x - left - width);
  const dy = Math.max(bottom - y, 0, y - bottom - depth);
  return dx * dx + dy * dy < radius ** 2;
}

function wallRect({points: [ax, ay, bx, by], width}) {
  const half = width / 2;
  return Math.abs(ay - by) < .001
    ? [Math.min(ax, bx), Math.min(ay, by) - half, Math.abs(bx - ax), width]
    : [Math.min(ax, bx) - half, Math.min(ay, by), width, Math.abs(by - ay)];
}

function roomCandidates(room) {
  const [x, y, w, d] = room.sleepingRect ?? room.rect;
  const samples = [[.5, .72], [.5, .28], [.5, .5], [.28, .5], [.72, .5],
    [.28, .28], [.72, .28], [.28, .72], [.72, .72]].map(([u, v]) => [x + u * w, y + v * d]);
  if (!room.door || room.sleepingRect) return samples;
  const {axis, fixed, span: [a, b]} = room.door, center = (a + b) / 2;
  const approach = [-.55, .55].map(offset => axis === 'h' ? [center, fixed + offset] : [fixed + offset, center]);
  return ['bath','kitchen'].includes(room.kind) ? [...samples,...approach] : [...approach,...samples];
}

export function createWalkLayout(model, openingEntries) {
  const levels = new Map();
  const doors = new Map([...openingEntries.values()].filter(entry => entry.wall.kind === 'door')
    .map(entry => [entry.wall.id, entry]));

  function allows(level, home, x, y, exceptDoor) {
    const layout = levels.get(`${level}:${home}`);
    if (!layout || !inside(layout.shell, x, y) || nearEdge(layout.shell, x, y)) return false;
    return !layout.obstacles.some(rect => nearRect(rect, x, y)) &&
      !layout.doors.some(({rect, entry, wall}) => wall !== exceptDoor &&
        (entry?.value ?? 0) < .85 && nearRect(rect, x, y));
  }

  function region(level, home, x, y) {
    for (const [roomId, polygon] of levels.get(`${level}:${home}`)?.roomPolygons ?? []) {
      if (inside(polygon, x, y)) return roomId;
    }
    return '';
  }

  for (const [levelKey, shells] of Object.entries(model.floorPolygons)) {
    const level = Number(levelKey);
    for (const [home, shell] of Object.entries(shells)) {
      const isLocal = item => item.level === level && (item.home === home || item.home === 'both') && !item.projectionOnly;
      const walls = model.walls.filter(isLocal).filter(wall => !wall.frontParapet);
      const stairX = home === 'A' ? 2.65 : model.joinedLayout.totalWidth - 6.8;
      const obstacles = [[stairX, 8.8, 4.15, 2.4],
        ...walls.filter(wall => wall.kind === 'wall' || wall.kind === 'window').map(wallRect),
        ...model.columns.filter(isLocal).map(column => column.rect),
        ...model.wallJoints.filter(isLocal).map(joint => joint.rect)];
      const doorways = walls.filter(wall => wall.kind === 'door')
        .map(wall => ({wall, rect: wallRect(wall), entry: doors.get(wall.id)}));
      const entryX = level === 1 ? 9.25 : 9.15;
      const entryY = level === 1 ? 3.25 : 10.25;
      const entry = [home === 'A' ? entryX : model.joinedLayout.totalWidth - entryX, entryY];
      const stairHall = [home === 'A' ? 9.15 : model.joinedLayout.totalWidth - 9.15, 10.25];
      // Match the first-floor open shelf in makeV7Fixtures.
      const shelfX = home === 'A' ? 6.68 : model.joinedLayout.totalWidth - 6.86;
      const guideObstacles = level === 1 ? [[shelfX, 2.85, .18, 3.55]] : [];
      const layout = {shell, obstacles, doors: doorways, entry, rooms: [], roomStarts: new Map(),
        roomPolygons: new Map(), portals: new Map()};
      levels.set(`${level}:${home}`, layout);

      for (const room of model.rooms.filter(isLocal)) {
        if (!roomKinds.has(room.kind)) continue;
        const [x, y, w, d] = room.rect;
        const polygon = room.polygon ?? [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
        const furniture = [
          ...model.beds.filter(bed => bed.room === room.id).map(bed => [bed.x, bed.y, bed.w, bed.d]),
          ...model.bedroomDesks.filter(desk => desk.room === room.id).map(desk => desk.rect),
          ...model.bedsideTables.filter(table => table.room === room.id).map(table => table.rect),
        ];
        guideObstacles.push(...furniture);
        const candidates = roomCandidates(room);
        if (room.id.endsWith('-stair-hall')) candidates.unshift(stairHall);
        // Leave enough space to see the arrow leading out of the vestibule.
        if (room.id.endsWith('-court-vestibule')) {
          candidates.unshift([home === 'A' ? 7.65 : model.joinedLayout.totalWidth - 7.65, 7.18]);
        }
        const point = candidates.find(([px, py]) =>
          inside(polygon, px, py) && allows(level, home, px, py) &&
          !furniture.some(rect => nearRect(rect, px, py)));
        if (point) {
          layout.rooms.push(room);
          layout.roomStarts.set(room.id, point);
          layout.roomPolygons.set(room.id, polygon);
          layout.portals.set(room.id, []);
        }
      }

      const navigable = (x, y, wall) => allows(level, home, x, y, wall) &&
        !guideObstacles.some(rect => nearRect(rect, x, y));
      function connect(from, to, threshold, direction, wall, entry) {
        if (!from || !to || from === to || !layout.portals.has(from) || !layout.portals.has(to)) return;
        const [x, y] = threshold, [dx, dy] = direction;
        const approach = (roomId, side) => [.60, .48, .36, .72].map(offset =>
          [x + side * dx * offset, y + side * dy * offset]).find(([px, py]) =>
          region(level, home, px, py) === roomId && navigable(px, py, wall));
        const origin = approach(from, -1), target = approach(to, 1);
        if (!origin || !target) return;
        const steps = Math.ceil(Math.hypot(target[0] - origin[0], target[1] - origin[1]) / .08);
        for (let i = 1; i < steps; i++) {
          if (!navigable(origin[0] + (target[0] - origin[0]) * i / steps,
                         origin[1] + (target[1] - origin[1]) * i / steps, wall)) return;
        }
        layout.portals.get(from).push({to, point: origin, direction, entry});
        layout.portals.get(to).push({to: from, point: target, direction: [-dx, -dy], entry});
      }

      for (const {wall, entry} of doorways) {
        const [ax, ay, bx, by] = wall.points;
        const threshold = [(ax + bx) / 2, (ay + by) / 2];
        const direction = Math.abs(ay - by) < .001 ? [0, 1] : [1, 0];
        const sides = [-.35, .35].map(offset => region(level, home,
          threshold[0] + offset * direction[0], threshold[1] + offset * direction[1]));
        connect(...sides, threshold, direction, wall, entry);
      }

      // Open thresholds measured from the model, mirrored for the second house.
      const passages = [['stair-hall', 'north-hall', 8.55, 11.3, 0, 1]];
      if (level === 1) passages.push(
        ['hall', 'living', 6.9, 6.6, -1, 0],
        ['living', 'court-vestibule', 6.05, 6.9, 0, 1],
        ['court-vestibule', 'stair-hall', 7.65, 8.7, 0, 1],
        ['north-hall', 'dry-store', 6, 12.8, 0, 1],
        ['north-hall', 'dining', 10.2, 12.05, 1, 0],
      );
      for (const [from, to, x, y, dx, dy] of passages) {
        const prefix = `${home}${level}-`;
        const mirrored = home === 'B';
        connect(prefix + from, prefix + to, [mirrored ? model.joinedLayout.totalWidth - x : x, y],
          [mirrored ? -dx : dx, dy]);
      }
    }
  }

  return {
    allows,
    region,
    portals(level, home, roomId) {
      return levels.get(`${level}:${home}`)?.portals.get(roomId) ?? [];
    },
    start(level, home, roomId) {
      const layout = levels.get(`${level}:${home}`);
      return layout && (layout.roomStarts.get(roomId) ?? layout.entry);
    },
    rooms(level, home) {
      return levels.get(`${level}:${home}`)?.rooms ?? [];
    },
  };
}
