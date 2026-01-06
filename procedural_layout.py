import math
import random

def is_point_in_polygon(x, y, poly):
    """
    Standard Ray Casting algorithm for point-in-polygon.
    """
    n = len(poly)
    inside = False
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def place_furniture_in_room(room_polygon, furniture_list, templates):
    """
    Procedural Room Filler Logic.
    Calculates localized placements within a room polygon.
    """
    # 1. Get Bounding Box
    min_x = min(p[0] for p in room_polygon)
    max_x = max(p[0] for p in room_polygon)
    min_y = min(p[1] for p in room_polygon)
    max_y = max(p[1] for p in room_polygon)
    
    width = max_x - min_x
    height = max_y - min_y
    
    placements = []
    
    for item in furniture_list:
        template = templates.get(item['type'], templates['default'])
        
        # Logic: AI provides relative (0-1) context
        # But we verify it's inside the polygon
        rel_x = item.get('x_rel', 0.5)
        rel_y = item.get('y_rel', 0.5)
        
        world_x = min_x + (rel_x * width)
        world_y = min_y + (rel_y * height)
        
        # Verification & Jitter (to avoid overlap if multiple items)
        retries = 5
        while not is_point_in_polygon(world_x, world_y, room_polygon) and retries > 0:
            world_x += random.uniform(-0.5, 0.5)
            world_y += random.uniform(-0.5, 0.5)
            retries -= 1
            
        placements.append({
            "id": template["id"],
            "x": world_x,
            "y": world_y,
            "rotation": item.get('rotation', 0),
            "label": item.get('description', template['label'])
        })
        
    return placements

# EXAMPLE USAGE
room_square = [(0,0), (5,0), (5,5), (0,5)]
furniture_reqs = [
    {"type": "sofa-2", "x_rel": 0.5, "y_rel": 0.1, "rotation": 0, "description": "Lounge Area"},
    {"type": "coffee-table", "x_rel": 0.5, "y_rel": 0.3, "rotation": 0, "description": "Center Piece"}
]
template_db = {
    "sofa-2": {"id": "sofa-2", "label": "2-Seater Sofa", "w": 1.6, "d": 0.9},
    "default": {"id": "box", "label": "Furniture", "w": 1.0, "d": 1.0}
}

result = place_furniture_in_room(room_square, furniture_reqs, template_db)
print("--- Final Placements ---")
for p in result:
    print(f"Item: {p['label']} at ({p['x']:.2f}, {p['y']:.2f})")
