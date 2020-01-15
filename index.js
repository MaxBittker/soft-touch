const { setupOverlay } = require("regl-shader-error-overlay");
setupOverlay();

function downloadURI(uri, filename) {
  var link = document.createElement("a");
  link.download = filename;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const regl = require("regl")({
  pixelRatio: Math.min(window.devicePixelRatio, 2)
});

let shaders = require("./src/pack.shader.js");
let vert = shaders.vertex;
let frag = shaders.fragment;

shaders.on("change", () => {
  console.log("update");
  vert = shaders.vertex;
  frag = shaders.fragment;
  let overlay = document.getElementById("regl-overlay-error");
  overlay && overlay.parentNode.removeChild(overlay);
});

const lastFrame = regl.texture();

let drawTriangle = regl({
  uniforms: {
    // Becomes `uniform float t`  and `uniform vec2 resolution` in the shader.
    t: ({ tick }) => tick,
    resolution: ({ viewportWidth, viewportHeight }) => [
      viewportWidth,
      viewportHeight
    ],
    backBuffer: lastFrame
  },

  frag: () => shaders.fragment,
  vert: () => shaders.vertex,
  attributes: {
    // Full screen triangle
    position: [
      [-1, 4],
      [-1, -1],
      [4, -1]
    ]
  },
  // Our triangle has 3 vertices
  count: 3
});

regl.frame(function(context) {
  regl.clear({
    color: [0, 0, 0, 1]
  });
  drawTriangle();
  lastFrame({
    copy: true
  });
});
