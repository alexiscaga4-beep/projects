const fs = require('fs');
const path = require('path');

function getBounds(filePath) {
  const buf = fs.readFileSync(filePath);
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen);
  const gltf = JSON.parse(jsonStr);

  let globalMin = [Infinity, Infinity, Infinity];
  let globalMax = [-Infinity, -Infinity, -Infinity];

  (gltf.accessors || []).forEach(acc => {
    // Look for POSITION accessors
    if (acc.min && acc.max && acc.type === 'VEC3') {
      for (let i = 0; i < 3; i++) {
        if (acc.min[i] < globalMin[i]) globalMin[i] = acc.min[i];
        if (acc.max[i] > globalMax[i]) globalMax[i] = acc.max[i];
      }
    }
  });

  const size = [
    globalMax[0] - globalMin[0],
    globalMax[1] - globalMin[1],
    globalMax[2] - globalMin[2]
  ];

  return {
    file: path.basename(filePath),
    min: globalMin.map(v => +v.toFixed(3)),
    max: globalMax.map(v => +v.toFixed(3)),
    size: size.map(v => +v.toFixed(3)),
    maxDim: +Math.max(...size).toFixed(3)
  };
}

const dir = path.join(__dirname, 'PlayableWebDemo', 'models');
fs.readdirSync(dir).filter(f => f.endsWith('.glb')).forEach(f => {
  console.log(JSON.stringify(getBounds(path.join(dir, f)), null, 2));
});
