import type { Point } from '../types';

export const distance = (p1: Point, p2: Point): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const sub = (p1: Point, p2: Point): Point => ({ x: p1.x - p2.x, y: p1.y - p2.y });
export const add = (p1: Point, p2: Point): Point => ({ x: p1.x + p2.x, y: p1.y + p2.y });
export const scale = (p: Point, s: number): Point => ({ x: p.x * s, y: p.y * s });

export const projectPointOnSegment = (p: Point, a: Point, b: Point): { point: Point; t: number } => {
    const ab = sub(b, a);
    const ap = sub(p, a);
    const lenSq = ab.x * ab.x + ab.y * ab.y;
    if (lenSq === 0) return { point: a, t: 0 };

    let t = (ap.x * ab.x + ap.y * ab.y) / lenSq;
    t = Math.max(0, Math.min(1, t));

    return {
        point: add(a, scale(ab, t)),
        t
    };
};

export const pointToSegmentDistance = (p: Point, a: Point, b: Point): number => {
    const { point } = projectPointOnSegment(p, a, b);
    return distance(p, point);
};

export const isPointInPolygon = (p: Point, vs: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i].x, yi = vs[i].y;
        const xj = vs[j].x, yj = vs[j].y;
        const intersect = ((yi > p.y) !== (yj > p.y))
            && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

// --- Wall Merging Helpers ---

export const areCollinear = (p1: Point, p2: Point, p3: Point, p4: Point, threshold = 0.05): boolean => {
    // Check if p3 and p4 lie on the line defined by p1 and p2
    const d3 = pointToSegmentDistance(p3, p1, p2);
    const d4 = pointToSegmentDistance(p4, p1, p2);

    // Also check if the directions are roughly the same (or opposite)
    // to ensure they are on the "same line" even if segments don't overlap yet
    if (d3 < threshold && d4 < threshold) return true;

    // Alternative check for segments that don't overlap but are on the same INFINTIE line
    const dx12 = p2.x - p1.x;
    const dy12 = p2.y - p1.y;
    const len12 = Math.sqrt(dx12 * dx12 + dy12 * dy12);
    if (len12 < 0.001) return false;

    // Cross product to check alignment of 1-2 and 1-3
    const cross3 = Math.abs((p3.y - p1.y) * dx12 - (p3.x - p1.x) * dy12) / len12;
    const cross4 = Math.abs((p4.y - p1.y) * dx12 - (p4.x - p1.x) * dy12) / len12;

    return cross3 < threshold && cross4 < threshold;
};

export const segmentsOverlap = (a: Point, b: Point, c: Point, d: Point): boolean => {
    // Assumes segments are collinear. Checks if their projection intervals overlap.
    const ab_len = distance(a, b);
    if (ab_len < 0.001) return false;

    const t_c = projectPointOnSegment(c, a, b).t;
    const t_d = projectPointOnSegment(d, a, b).t;

    // If either point projects inside [0, 1], they overlap
    if ((t_c > -0.01 && t_c < 1.01) || (t_d > -0.01 && t_d < 1.01)) return true;

    // Or if one segment completely contains the other
    const min_t = Math.min(t_c, t_d);
    const max_t = Math.max(t_c, t_d);
    if (min_t <= 0 && max_t >= 1) return true;

    return false;
};

export const mergeSegments = (a: Point, b: Point, c: Point, d: Point): { start: Point; end: Point } => {
    // Assumes collinear and overlapping. Finds the two points that are furthest apart.
    const pts = [a, b, c, d];
    let maxDist = -1;
    let bestPair = { start: a, end: b };

    for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
            const d = distance(pts[i], pts[j]);
            if (d > maxDist) {
                maxDist = d;
                bestPair = { start: pts[i], end: pts[j] };
            }
        }
    }
    return bestPair;
};
