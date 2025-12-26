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
