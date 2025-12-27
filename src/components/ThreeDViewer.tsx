import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, ContactShadows, Environment } from '@react-three/drei';
import type { Wall, Furniture } from '../types';

interface ThreeDViewerProps {
    walls: Wall[];
    objects: any[];
    furniture: Furniture[];
}

// --- FURNITURE COMPONENTS ---

const SofaModel: React.FC<{ width: number; depth: number; color: string }> = ({ width, depth, color }) => {
    const seatHeight = 0.4;
    const backHeight = 0.8;
    const padding = 0.1;

    return (
        <group>
            {/* Base/Seat */}
            <mesh position={[0, seatHeight / 2, 0]}>
                <boxGeometry args={[width, seatHeight, depth]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Backrest */}
            <mesh position={[0, backHeight / 2, -depth / 2 + padding / 2]}>
                <boxGeometry args={[width, backHeight, padding]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Armrests */}
            <mesh position={[-width / 2 + padding / 2, (seatHeight + 0.2) / 2, 0]}>
                <boxGeometry args={[padding, seatHeight + 0.2, depth]} />
                <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[width / 2 - padding / 2, (seatHeight + 0.2) / 2, 0]}>
                <boxGeometry args={[padding, seatHeight + 0.2, depth]} />
                <meshStandardMaterial color={color} />
            </mesh>
        </group>
    );
};

const BedModel: React.FC<{ width: number; depth: number; color: string }> = ({ width, depth, color }) => {
    const frameHeight = 0.3;
    const mattressHeight = 0.2;

    return (
        <group>
            {/* Frame */}
            <mesh position={[0, frameHeight / 2, 0]}>
                <boxGeometry args={[width, frameHeight, depth]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Mattress */}
            <mesh position={[0, frameHeight + mattressHeight / 2, 0]}>
                <boxGeometry args={[width * 0.95, mattressHeight, depth * 0.95]} />
                <meshStandardMaterial color="#f8f9fa" />
            </mesh>
            {/* Headboard */}
            <mesh position={[0, 0.5, -depth / 2 + 0.05]}>
                <boxGeometry args={[width, 1, 0.1]} />
                <meshStandardMaterial color={color} />
            </mesh>
        </group>
    );
};

const TableModel: React.FC<{ width: number; depth: number; color: string; height?: number }> = ({ width, depth, color, height = 0.75 }) => {
    const legWidth = 0.05;
    const topThickness = 0.04;

    return (
        <group>
            {/* Table Top */}
            <mesh position={[0, height - topThickness / 2, 0]}>
                <boxGeometry args={[width, topThickness, depth]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Legs */}
            {[
                [-width / 2 + legWidth, -depth / 2 + legWidth],
                [width / 2 - legWidth, -depth / 2 + legWidth],
                [-width / 2 + legWidth, depth / 2 - legWidth],
                [width / 2 - legWidth, depth / 2 - legWidth]
            ].map((pos, i) => (
                <mesh key={i} position={[pos[0], height / 2, pos[1]]}>
                    <boxGeometry args={[legWidth, height, legWidth]} />
                    <meshStandardMaterial color={color} />
                </mesh>
            ))}
        </group>
    );
};

const StorageModel: React.FC<{ width: number; depth: number; height: number; color: string }> = ({ width, depth, height, color }) => (
    <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} />
    </mesh>
);

const PlumbingModel: React.FC<{ width: number; depth: number; height: number; type: 'toilet' | 'tub' | 'shower' }> = ({ width, depth, height, type }) => {
    if (type === 'toilet') {
        return (
            <group>
                <mesh position={[0, 0.2, 0.1]}>
                    <cylinderGeometry args={[0.2, 0.2, 0.4, 16]} />
                    <meshStandardMaterial color="#f8f9fa" />
                </mesh>
                <mesh position={[0, 0.4, -0.2]}>
                    <boxGeometry args={[0.4, 0.8, 0.25]} />
                    <meshStandardMaterial color="#f8f9fa" />
                </mesh>
            </group>
        );
    }
    if (type === 'tub') {
        return (
            <mesh position={[0, 0.25, 0]}>
                <boxGeometry args={[width, 0.5, depth]} />
                <meshStandardMaterial color="#e9ecef" />
            </mesh>
        );
    }
    return (
        <mesh position={[0, height / 2, 0]}>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#dee2e6" transparent opacity={0.3} />
        </mesh>
    );
};

// --- CORE LOGIC ---

const WallMesh: React.FC<{ wall: Wall }> = ({ wall }) => {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const midX = (wall.start.x + wall.end.x) / 2;
    const midY = (wall.start.y + wall.end.y) / 2;

    return (
        <mesh position={[midX, wall.height / 2, midY]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[length, wall.height, wall.thickness]} />
            <meshStandardMaterial color={wall.isVirtual ? "#4dabf7" : "#f1f3f5"} opacity={wall.isVirtual ? 0.3 : 1} transparent={wall.isVirtual} />
        </mesh>
    );
};

const FurnitureMesh: React.FC<{ item: Furniture }> = ({ item }) => {
    const rotationRad = (item.rotation * Math.PI) / 180;

    // Choose model based on templateId or category
    const renderModel = () => {
        const id = item.templateId;
        const color = id.includes('sofa') || id === 'armchair' ? '#495057' :
            id.includes('bed') ? '#6d4c41' :
                id.includes('table') || id === 'tv-stand' || id === 'nightstand' ? '#8d6e63' :
                    '#adb5bd';

        if (id.includes('sofa') || id === 'armchair') {
            return <SofaModel width={item.width} depth={item.depth} color={color} />;
        }
        if (id.includes('bed')) {
            return <BedModel width={item.width} depth={item.depth} color={color} />;
        }
        if (id.includes('table') || id === 'coffee-table') {
            return <TableModel width={item.width} depth={item.depth} color={color} />;
        }
        if (id === 'wardrobe' || id === 'fridge' || id === 'tv-stand') {
            const h = id === 'tv-stand' ? 0.4 : 2.0;
            return <StorageModel width={item.width} depth={item.depth} height={h} color={color} />;
        }
        if (['toilet', 'bathtub', 'shower'].includes(id)) {
            const type = id === 'bathtub' ? 'tub' : (id as 'toilet' | 'shower');
            return <PlumbingModel width={item.width} depth={item.depth} height={2.2} type={type} />;
        }

        // Default Box for others
        return (
            <mesh position={[0, 0.375, 0]}>
                <boxGeometry args={[item.width, 0.75, item.depth]} />
                <meshStandardMaterial color={color} />
            </mesh>
        );
    };

    return (
        <group position={[item.x, 0, item.y]} rotation={[0, -rotationRad, 0]}>
            {renderModel()}
        </group>
    );
};

export const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ walls, furniture }) => {
    return (
        <div className="w-full h-full bg-zinc-950">
            <Canvas shadows gl={{ antialias: true }}>
                <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={40} />
                <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />

                <Suspense fallback={null}>
                    <Environment preset="city" />

                    <group>
                        {/* Floor */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                            <planeGeometry args={[100, 100]} />
                            <meshStandardMaterial color="#f1f3f5" />
                        </mesh>
                        <Grid args={[100, 100]} sectionColor="#adb5bd" cellColor="#dee2e6" infiniteGrid />

                        {/* Walls */}
                        {walls.map(wall => <WallMesh key={wall.id} wall={wall} />)}

                        {/* Furniture */}
                        {furniture.map(f => <FurnitureMesh key={f.id} item={f} />)}
                    </group>

                    <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={30} blur={2.5} far={10} />
                </Suspense>

                <ambientLight intensity={0.6} />
                <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
            </Canvas>
        </div>
    );
};
