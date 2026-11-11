const fs = require('fs');
const p = 'src/film/ShotCanvasV2.tsx';
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('const strips = 12;');
if (start < 0) throw new Error('strips block not found');
const endMarker = `        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Feather the plate into an oval`;
const end = s.indexOf(endMarker, start);
if (end < 0) throw new Error('end marker not found');
const replacement = `        // One single draw for the whole plate. Splitting it into vertical
        // strips and transforming each one independently left visible seams
        // (each strip is an affine approximation, and neighbouring strips
        // disagreed by a fraction of a pixel). A single affine transform of
        // the whole plane is seamless, and at these small camera angles the
        // difference from a true homography is invisible.
        const o = flat(-W / 2, -H / 2);
        const ex = flat(-W / 2 + 1, -H / 2);
        const ey = flat(-W / 2, -H / 2 + 1);
        ctx.setTransform(
          ex.x - o.x,
          ex.y - o.y,
          ey.x - o.x,
          ey.y - o.y,
          W / 2 + o.x,
          H / 2 + o.y,
        );
        ctx.drawImage(cloud.plate, 0, 0, W, H);
`;
s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(p, s);
console.log('patched', p, start, end);
