import type { MaterialDefinition } from '../types';

export const SURFACE_MATERIALS: MaterialDefinition[] = [
    // WOOD
    { id: 'wood-oak', name: 'Natural Oak', category: 'wood', color: '#d2b48c', roughness: 0.6 },
    { id: 'wood-walnut', name: 'Dark Walnut', category: 'wood', color: '#5d4037', roughness: 0.5 },
    { id: 'wood-pine', name: 'Light Pine', category: 'wood', color: '#f5deb3', roughness: 0.7 },

    // TILES
    { id: 'tile-white', name: 'White Ceramic', category: 'tile', color: '#ffffff', roughness: 0.2, metalness: 0.1 },
    { id: 'tile-grey', name: 'Slate Grey', category: 'tile', color: '#495057', roughness: 0.4 },
    { id: 'tile-marble', name: 'Carrara Marble', category: 'tile', color: '#e9ecef', roughness: 0.1, metalness: 0.2 },

    // STONE
    { id: 'stone-concrete', name: 'Polished Concrete', category: 'stone', color: '#adb5bd', roughness: 0.5 },
    { id: 'stone-brick', name: 'Red Brick', category: 'stone', color: '#a52a2a', roughness: 0.9 },

    // PAINT
    { id: 'paint-white', name: 'Pure White', category: 'paint', color: '#f8f9fa', roughness: 0.9 },
    { id: 'paint-navy', name: 'Navy Blue', category: 'paint', color: '#1a237e', roughness: 0.8 },
    { id: 'paint-sage', name: 'Sage Green', category: 'paint', color: '#81c784', roughness: 0.9 },
    { id: 'paint-terracotta', name: 'Terracotta', category: 'paint', color: '#e57373', roughness: 0.9 },

    // CARPET
    { id: 'carpet-beige', name: 'Cream Carpet', category: 'carpet', color: '#f5f5dc', roughness: 1.0 },
    { id: 'carpet-charcoal', name: 'Charcoal Carpet', category: 'carpet', color: '#212529', roughness: 1.0 },

    // PATTERNED MATERIALS (Physically Sized)
    {
        id: 'pattern-oak-parquet',
        name: 'Oak Parquet',
        category: 'wood',
        color: '#d2b48c',
        textureUrl: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?q=80&w=1000&auto=format&fit=crop',
        realSize: [1.0, 1.0], // 100cm x 100cm
        roughness: 0.6
    },
    {
        id: 'pattern-checker-tile',
        name: 'Checker Tile',
        category: 'tile',
        color: '#ffffff',
        textureUrl: 'https://images.unsplash.com/photo-1621939514649-280e2ee20f60?q=80&w=1000&auto=format&fit=crop',
        realSize: [0.6, 0.6], // 60cm x 60cm
        roughness: 0.2
    },
    {
        id: 'pattern-brick-wall',
        name: 'Exposed Brick',
        category: 'stone',
        color: '#a52a2a',
        textureUrl: 'https://images.unsplash.com/photo-1549417229-aa67d3263c09?q=80&w=1000&auto=format&fit=crop',
        realSize: [0.8, 0.4], // 80cm x 40cm
        roughness: 0.9
    },
    {
        id: 'tile-blue-subway',
        name: 'Blue Subway Tile',
        category: 'tile',
        color: '#78909c',
        textureUrl: '/textures/blue-subway-tile.jpg',
        realSize: [0.9, 0.6], // 90cm x 60cm pattern
        roughness: 0.3,
        metalness: 0.1
    }
];
