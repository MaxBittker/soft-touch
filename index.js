const { setupOverlay } = require("regl-shader-error-overlay");
setupOverlay();

let pixelRatio = Math.min(window.devicePixelRatio, 1.5);
const regl = require("regl")({
  pixelRatio,
  // extensions: ["OES_texture_float"],
  optionalExtensions: [
    // "oes_texture_float_linear"
    // "WEBGL_debug_renderer_info",
    // "WEBGL_debug_shaders"
  ]
});

let shaders = require("./src/pack.shader.js");
let postShaders = require("./src/post.shader.js");
let setupHandlers = require("./src/touch.js");

let vert = shaders.vertex;
let frag = shaders.fragment;

let getPointers = setupHandlers(regl._gl.canvas, pixelRatio);
pointers = getPointers();
shaders.on("change", () => {
  console.log("update");
  vert = shaders.vertex;
  frag = shaders.fragment;
  let overlay = document.getElementById("regl-overlay-error");
  overlay && overlay.parentNode.removeChild(overlay);
});

function createDoubleFBO() {
  let fbo1 = regl.framebuffer();
  let fbo2 = regl.framebuffer();

  return {
    resize(w, h) {
      fbo1.resize(w, h);
      fbo2.resize(w, h);
    },
    get read() {
      return fbo1;
    },
    get write() {
      return fbo2;
    },
    swap() {
      let temp = fbo1;
      fbo1 = fbo2;
      fbo2 = temp;
    }
  };
}

const densityDoubleFBO = createDoubleFBO();

const drawFboBlurred = regl({
  frag: () => postShaders.fragment,
  vert: () => postShaders.vertex,

  attributes: {
    position: [-4, -4, 4, -4, 0, 4]
  },
  uniforms: {
    t: ({ tick }) => tick,
    tex: ({ count }) => densityDoubleFBO.read,
    resolution: ({ viewportWidth, viewportHeight }) => [
      viewportWidth,
      viewportHeight
    ],
    wRcp: ({ viewportWidth }) => 1.0 / viewportWidth,
    hRcp: ({ viewportHeight }) => 1.0 / viewportHeight,
    pixelRatio
  },
  depth: { enable: false },
  count: 3
});

let drawTriangle = regl({
  framebuffer: () => densityDoubleFBO.write,

  uniforms: {
    t: ({ tick }) => tick,
    force: regl.prop("force"),
    point: (context, props) => [
      props.pointer.texcoordX,
      props.pointer.texcoordY
    ],
    prevPoint: (context, props) => [
      props.pointer.prevTexcoordX,
      props.pointer.prevTexcoordY
    ],
    resolution: ({ viewportWidth, viewportHeight }) => [
      viewportWidth,
      viewportHeight
    ],
    backBuffer: () => densityDoubleFBO.read
  },

  frag: () => shaders.fragment,
  vert: () => shaders.vertex,
  attributes: {
    position: [
      [-1, 4],
      [-1, -1],
      [4, -1]
    ]
  },
  depth: { enable: false },

  count: 3
});

regl.frame(function({ viewportWidth, viewportHeight, tick }) {
  densityDoubleFBO.resize(viewportWidth, viewportHeight);

  pointers.forEach(pointer => {
    if (!pointer.down) {
      return;
    }
    // console.log(pointer);
    pointer.moved = false;
    // console.log(pointer.id);
    drawTriangle({ pointer, force: pointer.force || 0.5 });
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    densityDoubleFBO.swap();
  });
  drawTriangle({
    pointer: {
      texcoordX: -9,
      texcoordY: -9,
      prevTexcoordX: -10,
      prevTexcoordY: -10
    },
    force: 0.0
  });
  densityDoubleFBO.swap();

  drawFboBlurred();
});
