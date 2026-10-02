const fs = require('fs');
const path = require('path');

function inspectGLB(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 12) return { error: 'Too small' };
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546c67) return { error: 'Not a GLB' };
  const version = buf.readUInt32LE(4);
  const totalLen = buf.readUInt32LE(8);

  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonChunkType = buf.readUInt32LE(16);
  if (jsonChunkType !== 0x4e4f534a) return { error: 'First chunk not JSON' };

  const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen);
  try {
    const gltf = JSON.parse(jsonStr);
    const meshes = (gltf.meshes || []).map(m => m.name || 'unnamed');
    const nodes = (gltf.nodes || []).map(n => n.name || 'unnamed');
    const animations = (gltf.animations || []).map(a => a.name || 'unnamed');
    const materials = (gltf.materials || []).map(m => m.name || 'unnamed');
    const scene = gltf.scenes ? gltf.scenes[gltf.scene || 0] : null;
    return {
      name: path.basename(filePath),
      sizeMB: (buf.length / (1024 * 1024)).toFixed(2),
      generator: gltf.asset?.generator,
      meshCount: meshes.length,
      meshes: meshes.slice(0, 10),
      nodeCount: nodes.length,
      animations: animations,
      materials: materials.slice(0, 10),
      hasSkins: !!gltf.skins?.length
    };
  } catch (err) {
    return { error: err.message };
  }
}

const glbFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.glb'));
console.log('Inspecting GLB files:');
glbFiles.forEach(f => {
  const info = inspectGLB(path.join(__dirname, f));
  console.log('==============================');
  console.log(JSON.stringify(info, null, 2));
});
