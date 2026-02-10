const fs = require("fs");

const raw = fs.readFileSync("../data/cet.geojson", "utf8");
const geo = JSON.parse(raw);

const coords = {};
const graph = {};
const coordToId = new Map();
let nextId = 0;

// kazhap aan
function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}


// nodeID for when we want to access later ( Use this in to apply in actual app since it converts coordinates to nodes)
function getNodeId([x, y]) {
  const key = `${x},${y}`;
  if (!coordToId.has(key)) {
    coordToId.set(key, nextId);
    coords[nextId] = [x, y];
    graph[nextId] = [];
    nextId++;
  }
  return coordToId.get(key);
}


// setting up nodeID and graph for every feature in cet.geojson
for (const feature of geo.features) {
  if (feature.geometry.type !== "LineString") continue;

  const pts = feature.geometry.coordinates;

  for (let i = 0; i < pts.length - 1; i++) {
    const u = getNodeId(pts[i]);
    const v = getNodeId(pts[i + 1]);
    const w = dist(pts[i], pts[i + 1]);

    graph[u].push({ to: v, w });
    graph[v].push({ to: u, w });
  }
}

// read the function name, dumbass
function dijkstra(start, end, graph) {
  const dist = Array(graph.length).fill(undefined)
  const pq = [{ node: start, cost: 0, path: [start] }]

  while (pq.length > 0) {
    pq.sort((a, b) => a.cost - b.cost)
    const { node, cost, path } = pq.shift()

    if (dist[node] !== undefined) continue
    dist[node] = cost

    if (node === end) return path 

    for (const { to, w } of graph[node]) {
      if (dist[to] === undefined) {
        pq.push({
          node: to,
          cost: cost + w,
          path: [...path, to]
        })
      }
    }
  }

  return null
}

// returns the path of nodes to a path of coordinates
function nodes_to_coords(path){
  let new_path = [];
  for(const k of path){
    new_path = new_path.concat([coords[k]]);
  }
  return new_path
}

console.log(nodes_to_coords(dijkstra(1, 2, graph)))