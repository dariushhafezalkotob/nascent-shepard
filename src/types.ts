export interface Point {
    x: number;
    y: number;
}

export interface Wall {
    id: string;
    start: Point;
    end: Point;
    thickness: number;
    height: number; // Wall height in mm
}

export interface WallObject {
    id: string;
    wallId: string;
    type: 'door' | 'window';
    position: number; // 0 to 1 (normalized position along the wall)
    width: number;
    height: number;
    offset: number; // Distance from floor
    hinge?: 'left' | 'right'; // For doors
    openDirection?: 'in' | 'out'; // For doors
}

export interface RoomLabel {
    id: string;
    text: string;
    x: number;
    y: number;
}

export interface EditorState {
    walls: Wall[];
    objects: WallObject[];
    labels: RoomLabel[];
    selectedId: string | null;
    mode: 'select' | 'wall' | 'door' | 'window';
    pan: Point;
    zoom: number;
}
