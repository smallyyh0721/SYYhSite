function takeTexture(value, textures) {
  if (value && value.isTexture) textures.add(value);
}

/** Release geometries, materials, and textures. Bones stay with the scene graph. */
export function disposeScene(root) {
  if (!root) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.geometry) geometries.add(obj.geometry);
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of list) {
      if (!material) continue;
      materials.add(material);
      for (const key of Object.keys(material)) {
        const value = material[key];
        takeTexture(value, textures);
        if (Array.isArray(value)) {
          for (const item of value) takeTexture(item, textures);
        }
      }
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}
