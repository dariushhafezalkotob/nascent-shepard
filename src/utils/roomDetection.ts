import type { Wall, Point } from '../types';
import { distance, pointToSegmentDistance, projectPointOnSegment } from './geometry';

export interface Room {
    id: string;
    path: Point[];
    area: number;
    centroid: Point;
}

const EPSILON = 0.05; // Snap threshold (increased to match UI snapping)

// Generate a unique key for spatial hashing
const pointKey = (p: Point) => `${Math.round(p.x * 100)},${Math.round(p.y * 100)}`;

export const detectRooms = (walls: Wall[]): Room[] => {
    // 0. Pre-process: Planarize Graph (Handle T-Junctions)

    // Map wall ID to list of cut points (t values 0..1)
    const cuts = new Map<string, number[]>();

    const addCut = (wallId: string, t: number) => {
        if (t < EPSILON || t > 1 - EPSILON) return; // Ignore endpoints
        if (!cuts.has(wallId)) cuts.set(wallId, []);
        const list = cuts.get(wallId)!;
        if (!list.some(val => Math.abs(val - t) < 0.001)) { // Avoid duplicates
            list.push(t);
        }
    };

    // Find all T-junctions
    for (const w1 of walls) {
        for (const w2 of walls) {
            if (w1.id === w2.id) continue;

            const checkPoint = (p: Point) => {
                if (pointToSegmentDistance(p, w1.start, w1.end) < EPSILON) {
                    const { t } = projectPointOnSegment(p, w1.start, w1.end);
                    addCut(w1.id, t);
                }
            };

            checkPoint(w2.start);
            checkPoint(w2.end);
        }
    }

    const segments: { start: Point; end: Point }[] = [];

    walls.forEach(wall => {
        const wallCuts = cuts.get(wall.id);
        if (!wallCuts || wallCuts.length === 0) {
            segments.push({ start: wall.start, end: wall.end });
        } else {
            // Sort cuts
            wallCuts.sort((a, b) => a - b);

            let prevPoint = wall.start;

            const wallVec = { x: wall.end.x - wall.start.x, y: wall.end.y - wall.start.y };

            wallCuts.forEach(t => {
                const newPoint = {
                    x: wall.start.x + wallVec.x * t,
                    y: wall.start.y + wallVec.y * t
                };
                segments.push({ start: prevPoint, end: newPoint });
                prevPoint = newPoint;
            });

            segments.push({ start: prevPoint, end: wall.end });
        }
    });

    // 1. Build Graph from Segments
    const vertices = new Map<string, Point>();
    const adj = new Map<string, string[]>();

    const getVertexId = (p: Point): string => {
        const key = pointKey(p);
        for (const [id, point] of vertices.entries()) {
            if (distance(p, point) < EPSILON) return id;
        }
        vertices.set(key, p);
        adj.set(key, []);
        return key;
    };

    segments.forEach(seg => {
        const u = getVertexId(seg.start);
        const v = getVertexId(seg.end);

        if (u === v) return;

        if (!adj.get(u)!.includes(v)) adj.get(u)!.push(v);
        if (!adj.get(v)!.includes(u)) adj.get(v)!.push(u);
    });

    // 2. Sort adjacency lists by angle
    for (const [uId, neighbors] of adj.entries()) {
        const u = vertices.get(uId)!;
        neighbors.sort((aId, bId) => {
            const a = vertices.get(aId)!;
            const b = vertices.get(bId)!;
            const angleA = Math.atan2(a.y - u.y, a.x - u.x);
            const angleB = Math.atan2(b.y - u.y, b.x - u.x);
            return angleA - angleB;
        });
    }

    // 3. Find Cycles (Faces)
    const visitedEdges = new Set<string>(); // "u->v"
    const rooms: Room[] = [];

    const getEdgeId = (u: string, v: string) => `${u}->${v}`;

    for (const [u, neighbors] of adj.entries()) {
        for (const v of neighbors) {
            if (visitedEdges.has(getEdgeId(u, v))) continue;

            const pathVertices: string[] = [];
            let curr = u;
            let next = v;

            let loopCount = 0;
            const MAX_LOOPS = 1000;
            let invalid = false;

            const startEdge = getEdgeId(u, v);
            pathVertices.push(curr);

            while (loopCount++ < MAX_LOOPS) {
                visitedEdges.add(getEdgeId(curr, next));
                pathVertices.push(next);

                if (next === u) {
                    break;
                }

                const neighborsOfNext = adj.get(next)!;
                if (neighborsOfNext.length === 0) { invalid = true; break; }

                const idx = neighborsOfNext.indexOf(curr);
                if (idx === -1) { invalid = true; break; }

                // CW turn (Right wall following) produces CW polygons (Inner Rooms)
                const nextNeighborIdx = (idx - 1 + neighborsOfNext.length) % neighborsOfNext.length;

                curr = next;
                next = neighborsOfNext[nextNeighborIdx];

                if (visitedEdges.has(getEdgeId(curr, next)) && getEdgeId(curr, next) !== startEdge) {
                    invalid = true;
                    break;
                }
            }

            if (invalid || loopCount >= MAX_LOOPS || pathVertices.length < 3) continue;

            // Shoelace Area
            let area = 0;
            let cx = 0;
            let cy = 0;

            const polygon = pathVertices.slice(0, -1).map(id => vertices.get(id)!);

            for (let i = 0; i < polygon.length; i++) {
                const p1 = polygon[i];
                const p2 = polygon[(i + 1) % polygon.length];
                const cross = (p1.x * p2.y - p2.x * p1.y);
                area += cross;
                cx += (p1.x + p2.x) * cross;
                cy += (p1.y + p2.y) * cross;
            }
            area /= 2;

            if (area > 0.1) { // Positive Area check (CW in Y-down is an internal room)
                cx /= (6 * area);
                cy /= (6 * area);

                // Create a stable ID by sorting points and hashing them
                const sortedPoints = [...polygon].sort((a, b) => (a.x - b.x) || (a.y - b.y));
                const roomId = `room-${sortedPoints.map(p => `${Math.round(p.x * 100)},${Math.round(p.y * 100)}`).join('-')}`;

                rooms.push({
                    id: roomId,
                    path: polygon,
                    area: Math.abs(area),
                    centroid: { x: cx, y: cy }
                });
            }
        }
    }

    return rooms;
};
