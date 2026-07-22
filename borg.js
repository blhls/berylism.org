/* ============================================================
   berylism.org — BOP
   vessel · zarqa · consoles
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     1. GEOMETRY
     measured from ulbre_bixbite.png, normalised on the spike's
     top width, recentred so the resting bbox sits on y = 0.
     ============================================================ */

  var VB = { x: -2.2, y: -2.35, w: 4.4, h: 4.4 };

  // four triangles, three vertices each. order is fixed: the
  // morph maps index-to-index, so these lists must stay aligned.
  var REST = [
    /* apex-piece  */[[-0.496, -1.615], [0.491, -1.615], [0.000, -0.959]],
    /* left wing   */[[-1.478, -1.050], [-0.427, -1.050], [-0.953, -0.270]],
    /* right wing  */[[0.427, -1.050], [1.474, -1.050], [0.953, -0.270]],
    /* the spike   */[[-0.500, -1.050], [0.500, -1.050], [0.000, 1.614]]
  ];

  // configuration A — idle, profile, sail to starboard.
  // wings barely move; the apex-piece drops into the keel;
  // the spike swings all the way up and becomes the sail.
  var SHIP_A = [
    /* keel centre */[[-0.500, 0.500], [0.500, 0.500], [0.000, 1.155]],
    /* keel port   */[[-1.530, 0.500], [-0.478, 0.500], [-1.004, 1.289]],
    /* keel stbd   */[[0.478, 0.500], [1.530, 0.500], [1.004, 1.289]],
    /* the sail    */[[-0.320, 0.500], [0.980, 0.170], [-0.200, -2.100]]
  ];

  // the hole. collapsed to a point at rest, torn open in A.
  var HOLE_REST = [[0, 0.2], [0, 0.2], [0, 0.2], [0, 0.2], [0, 0.2]];
  var HOLE_SHIP = [
    [-0.050, -0.740], [0.140, -0.880], [0.300, -0.680],
    [0.220, -0.460], [0.020, -0.460]
  ];

  // where the resting glyph's centre sits inside the viewBox,
  // and where the ship's keel sits. used to anchor the sprite.
  var F_REST_Y = (0.0 - VB.y) / VB.h;   // 0.534
  var F_SHIP_Y = (1.289 - VB.y) / VB.h;   // 0.827

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // viscous easing: hesitates, then yields all at once, then settles
  function easeViscous(t) {
    t = clamp(t, 0, 1);
    var a = t * t * t * (t * (t * 6 - 15) + 10);      // smootherstep
    var b = 1 - Math.pow(1 - t, 3);
    return a * 0.72 + b * 0.28;
  }

  function triPath(tris, t) {
    var d = '';
    for (var i = 0; i < 4; i++) {
      var r = REST[i], s = SHIP_A[i];
      for (var v = 0; v < 3; v++) {
        var x = lerp(r[v][0], s[v][0], t);
        var y = lerp(r[v][1], s[v][1], t);
        d += (v === 0 ? 'M' : 'L') + x.toFixed(4) + ' ' + y.toFixed(4);
      }
      d += 'Z';
    }
    // the tear
    for (var h = 0; h < HOLE_SHIP.length; h++) {
      var hx = lerp(HOLE_REST[h][0], HOLE_SHIP[h][0], t);
      var hy = lerp(HOLE_REST[h][1], HOLE_SHIP[h][1], t);
      d += (h === 0 ? 'M' : 'L') + hx.toFixed(4) + ' ' + hy.toFixed(4);
    }
    d += 'Z';
    return d;
  }

  /* ============================================================
     2. THE VESSEL  (svg over the canvas)
     ============================================================ */

  var Vessel = {
    wrap: null, svg: null, main: null, gR: null, gB: null,
    shadow: null, turb: null, disp: null,
    t: 0, hover: false, glitching: false,

    build: function () {
      this.wrap = document.getElementById('vessel-wrap');
      var NS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('id', 'vessel');
      svg.setAttribute('viewBox', VB.x + ' ' + VB.y + ' ' + VB.w + ' ' + VB.h);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      var defs = document.createElementNS(NS, 'defs');
      var filt = document.createElementNS(NS, 'filter');
      filt.setAttribute('id', 'flesh');
      filt.setAttribute('x', '-50%'); filt.setAttribute('y', '-50%');
      filt.setAttribute('width', '200%'); filt.setAttribute('height', '200%');

      var turb = document.createElementNS(NS, 'feTurbulence');
      turb.setAttribute('type', 'fractalNoise');
      turb.setAttribute('baseFrequency', '0.9');
      turb.setAttribute('numOctaves', '3');
      turb.setAttribute('seed', '3');
      turb.setAttribute('result', 'n');

      var disp = document.createElementNS(NS, 'feDisplacementMap');
      disp.setAttribute('in', 'SourceGraphic');
      disp.setAttribute('in2', 'n');
      disp.setAttribute('scale', '0.012');
      disp.setAttribute('xChannelSelector', 'R');
      disp.setAttribute('yChannelSelector', 'G');

      filt.appendChild(turb); filt.appendChild(disp);
      defs.appendChild(filt); svg.appendChild(defs);

      // soft shadow on the sand
      var sh = document.createElementNS(NS, 'ellipse');
      sh.setAttribute('class', 'shadow');
      sh.setAttribute('cx', '0'); sh.setAttribute('cy', '1.30');
      sh.setAttribute('rx', '0'); sh.setAttribute('ry', '0.10');
      svg.appendChild(sh);

      var g = document.createElementNS(NS, 'g');
      g.setAttribute('filter', 'url(#flesh)');

      function mk(cls, fill, dx) {
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('class', cls);
        p.setAttribute('fill-rule', 'evenodd');
        if (fill) p.setAttribute('fill', fill);
        if (dx) p.setAttribute('transform', 'translate(' + dx + ',0)');
        return p;
      }
      this.gR = mk('ghost', '#E8336F', 0.035);
      this.gB = mk('ghost', '#007791', -0.035);
      this.main = mk('hull', null, 0);

      g.appendChild(this.gR); g.appendChild(this.gB); g.appendChild(this.main);
      svg.appendChild(g);
      this.wrap.appendChild(svg);

      this.svg = svg; this.shadow = sh; this.turb = turb; this.disp = disp;
      if (REDUCED) this.wrap.classList.add('no-motion');
      this.setT(0);

      var self = this;
      this.main.addEventListener('pointerenter', function () {
        self.hover = true; self.wrap.classList.add('is-hover');
      });
      this.main.addEventListener('pointerleave', function () {
        self.hover = false; self.wrap.classList.remove('is-hover');
      });
    },

    setT: function (t) {
      this.t = t;
      var d = triPath(null, t);
      this.main.setAttribute('d', d);
      this.gR.setAttribute('d', d);
      this.gB.setAttribute('d', d);
      this.shadow.setAttribute('rx', (1.45 * t).toFixed(3));
      this.shadow.setAttribute('opacity', (0.28 * t).toFixed(3));
      this.wrap.classList.toggle('is-rest', t < 0.02);
    },

    // scale: how much the mesh is being pulled about
    setViscosity: function (v) {
      this.disp.setAttribute('scale', v.toFixed(4));
    },

    // anchor the sprite. ax/ay in px; f is 0 at rest, 1 as a ship
    measure: function () {
      this.h = this.wrap.getBoundingClientRect().height || 320;
    },

    place: function (ax, ay, f) {
      if (!this.h) this.measure();
      var frac = lerp(F_REST_Y, F_SHIP_Y, clamp(f, 0, 1));
      this.wrap.style.left = ax + 'px';
      this.wrap.style.top = (ay - frac * this.h) + 'px';
      this.wrap.style.transform = 'translateX(-50%)';
    },

    glitch: function (ms) {
      var self = this;
      this.glitching = true;
      this.wrap.classList.add('is-glitch');
      setTimeout(function () {
        self.glitching = false;
        self.wrap.classList.remove('is-glitch');
      }, ms || 130);
    }
  };

  /* ============================================================
     3. SAHARA ZARQA  (three.js)
     ============================================================ */

  var VERT = [
    'uniform float uFold;',
    'uniform vec2  uFlat;',
    'uniform vec3  uFlatC;',
    'varying vec2  vUv;',
    'varying vec3  vN;',
    'varying float vF;',
    'void main(){',
    '  vUv = uv;',
    '  vN  = normalize(position);',
    '  vec3 flatP = uFlatC + vec3((uv.x-0.5)*uFlat.x, (uv.y-0.5)*uFlat.y, 0.0);',
    '  float f = clamp(uFold*1.55 - (1.0-uv.y)*0.55, 0.0, 1.0);',
    '  f = f*f*(3.0-2.0*f);',
    '  vF = f;',
    '  vec3 p = mix(flatP, position, f);',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'varying vec2  vUv;',
    'varying vec3  vN;',
    'varying float vF;',
    'uniform float uTime, uFold;',
    'uniform vec3  cDeep, cTyr, cInd, cPet, cAqu;',

    'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
    'float noise(vec2 p){',
    '  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),',
    '             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);',
    '}',

    'void main(){',
    '  float w = sin(vUv.x*19.0 + uTime*0.045)*0.010',
    '          + sin(vUv.x*43.0 - uTime*0.028)*0.005',
    '          + noise(vUv*7.0)*0.016;',
    '  float band = fract(vUv.y*44.0 + w*44.0);',
    '  float ridge = smoothstep(0.0,0.80,band)*(1.0-smoothstep(0.82,1.0,band));',
    '  float fine  = noise(vUv*vec2(180.0,90.0))*0.10;',
    '  float h = clamp(ridge*0.92 + fine, 0.0, 1.0);',

    '  vec3 L = normalize(vec3(-0.35,0.72,0.60));',
    '  float lam = clamp(dot(vN,L),0.0,1.0);',
    '  float lit = clamp(h*0.62 + lam*0.58, 0.0, 1.0);',

    '  vec3 c = cDeep;',
    '  c = mix(c, cTyr, smoothstep(0.06,0.36,lit));',
    '  c = mix(c, cInd, smoothstep(0.32,0.60,lit));',
    '  c = mix(c, cPet, smoothstep(0.58,0.82,lit));',
    '  c = mix(c, cAqu, smoothstep(0.84,1.00,lit));',

    '  float rim = pow(1.0 - clamp(dot(vN,vec3(0.0,0.0,1.0)),0.0,1.0), 2.6);',
    '  c += cAqu * rim * 0.16 * vF;',

    // flat wall before the fold
    '  vec3 flatc = mix(cDeep, cTyr, 0.55 + noise(vUv*40.0)*0.10);',
    '  c = mix(flatc, c, vF);',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  var POST = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D tD;',
    'uniform float uFish, uGlitch, uTime;',
    'vec2 barrel(vec2 uv, float k){',
    '  vec2 c = uv-0.5; float r2 = dot(c,c);',
    '  c *= 1.0 - k*r2; return c+0.5;',
    '}',
    'float hash(float n){ return fract(sin(n)*43758.5453); }',
    'void main(){',
    '  vec2 uv = vUv;',
    '  float slice = floor(uv.y*36.0);',
    '  float g = step(0.86, hash(slice+floor(uTime*11.0)));',
    '  uv.x += (hash(slice*3.1+floor(uTime*11.0))-0.5)*0.055*g*uGlitch;',
    '  float k = 0.115*uFish;',
    '  vec2 uR = barrel(uv, k*1.030);',
    '  vec2 uG = barrel(uv, k);',
    '  vec2 uB = barrel(uv, k*0.970);',
    '  if(uG.x<0.0||uG.x>1.0||uG.y<0.0||uG.y>1.0){ gl_FragColor=vec4(0.0); return; }',
    '  vec4 cR = texture2D(tD,uR), cG = texture2D(tD,uG), cB = texture2D(tD,uB);',
    '  float a = max(cG.a, max(cR.a,cB.a));',
    '  gl_FragColor = vec4(cR.r, cG.g, cB.b, a);',
    '}'
  ].join('\n');

  var POST_V = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';

  var Zarqa = {
    ok: false, R: 1.55, CY: -1.62,
    fold: 0, glitch: 0, spin: 0, spinV: 0,

    init: function () {
      if (typeof THREE === 'undefined') return false;
      var cv = document.getElementById('zarqa');
      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: cv, alpha: true, antialias: true, powerPreference: 'high-performance'
        });
      } catch (e) { return false; }

      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      this.scene = new THREE.Scene();
      this.cam = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      this.cam.position.set(0, 0.35, 3.30);
      this.lookAt = new THREE.Vector3(0, -0.45, 0);
      this.cam.lookAt(this.lookAt);

      var C = function (h) { return new THREE.Color(h); };
      this.uni = {
        uTime: { value: 0 }, uFold: { value: 0 },
        uFlat: { value: new THREE.Vector2(6, 4) },
        uFlatC: { value: new THREE.Vector3(0, 1.17, 0) },
        cDeep: { value: C(0x16030F) }, cTyr: { value: C(0x510B47) },
        cInd: { value: C(0x23306B) }, cPet: { value: C(0x007791) },
        cAqu: { value: C(0xC3FBF4) }
      };

            var small = Math.min(window.innerWidth, window.innerHeight) < 760;
      var geo = new THREE.SphereGeometry(this.R, small ? 96 : 160, small ? 64 : 110);
      var mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uni,
        side: THREE.DoubleSide
      });
      this.globe = new THREE.Mesh(geo, mat);
      this.globe.position.set(0, this.CY, 0);
      this.scene.add(this.globe);

      // post
      this.rt = new THREE.WebGLRenderTarget(2, 2, {
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
      });
      this.pUni = {
        tD: { value: this.rt.texture }, uFish: { value: 1 },
        uGlitch: { value: 0 }, uTime: { value: 0 }
      };
      this.pScene = new THREE.Scene();
      this.pCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.pScene.add(new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
          vertexShader: POST_V, fragmentShader: POST, uniforms: this.pUni,
          transparent: true, depthTest: false, depthWrite: false
        })
      ));

      this.apex = new THREE.Vector3(0, this.CY + this.R - 0.06, 0);
      this.ok = true;
      this.resize();
      return true;
    },

    resize: function () {
      if (!this.ok) return;
      var w = window.innerWidth, h = window.innerHeight;
      this.renderer.setSize(w, h, false);
      this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.rt.setSize(Math.floor(w * dpr), Math.floor(h * dpr));

      // flat plane must cover the frustum before the fold
      var dist = this.cam.position.distanceTo(this.lookAt);
      var vh = 2 * dist * Math.tan((this.cam.fov * Math.PI / 180) / 2);
      this.uni.uFlat.value.set(vh * this.cam.aspect * 1.30, vh * 1.30);
      this.uni.uFlatC.value.set(
        this.lookAt.x - this.globe.position.x,
        this.lookAt.y - this.globe.position.y,
        this.lookAt.z - this.globe.position.z
      );
    },

    // where the ship should sit, in css pixels
    anchor: function () {
      if (!this.ok) return { x: window.innerWidth / 2, y: window.innerHeight * 0.46 };
      var v = this.apex.clone().project(this.cam);
      return {
        x: (v.x * 0.5 + 0.5) * window.innerWidth,
        y: (-v.y * 0.5 + 0.5) * window.innerHeight
      };
    },

    render: function (time, dt) {
      if (!this.ok) return;
      this.uni.uTime.value = time;
      this.uni.uFold.value = this.fold;
      this.pUni.uTime.value = time;
      this.pUni.uGlitch.value = this.glitch;

      this.spin += this.spinV * dt;
      this.spinV *= Math.pow(0.0018, dt);
      this.globe.rotation.y = (this.spin + time * 0.006) * (this.fold * this.fold);

      this.renderer.setRenderTarget(this.rt);
      this.renderer.clear();
      this.renderer.render(this.scene, this.cam);
      this.renderer.setRenderTarget(null);
      this.renderer.clear();
      this.renderer.render(this.pScene, this.pCam);
    }
  };

  /* ============================================================
     4. CONSOLES
     ============================================================ */

  var GLIT = '✫ ❤ ✴ ꨄ ✧ ･ ﾟ ✦ ˚ ✩ ♡ ⋆ ｡ ✿ ☆ ｡';

  function glitterBlock(rows, cols) {
    var s = '', seq = GLIT.split(' ');
    for (var r = 0; r < rows; r++) {
      var line = '';
      for (var c = 0; c < cols; c++) {
        line += seq[(r * 7 + c * 3 + ((r * c) % 5)) % seq.length] + ' ';
      }
      s += line + '\n';
    }
    return s;
  }

  var Consoles = {
    built: false,

    build: function () {
      if (this.built) return;
      this.built = true;

      var host = document.getElementById('consoles');
      var mtl = document.createElement('div');
      mtl.className = 'mtl';
      mtl.innerHTML =
        '<div class="mtl-ghost" aria-hidden="true"><span></span></div>' +
        '<div class="mtl-win">' +
        '<div class="mtl-bar"><span>BOP</span><span class="dots">// // //</span></div>' +
        '<div class="mtl-body">' +
        '<h1 class="mtl-title"><span class="g">✫</span> ･ ﾟ ✴ &nbsp;A V I S&nbsp; ✴ ﾟ ･ <span class="g">✫</span></h1>' +
        '<p class="mtl-alert">your sail has a hole</p>' +
        '<hr class="mtl-rule">' +
        '<dl class="mtl-tele">' +
        '<dt>zone</dt><dd>SAHARA ZARQA <span class="dim">/ face visible</span></dd>' +
        '<dt>relèv.</dt><dd id="tl-gps">--</dd>' +
        '<dt>horloge</dt><dd id="tl-clock">--</dd>' +
        '<dt>état</dt><dd>immobile <span class="dim">— cap non fixé</span></dd>' +
        '</dl>' +
        '<p class="mtl-foot">pas de cookies. pas de stockage. rien de vous ne quitte cette page.</p>' +
        '</div></div>';
      host.appendChild(mtl);

      var span = mtl.querySelector('.mtl-ghost span');
      span.textContent = glitterBlock(48, 40);
      span.style.animation = 'glitterdrift 26s linear infinite';

      var st = document.createElement('style');
      st.textContent =
        '@keyframes glitterdrift{0%{transform:translate(-33.3%,-33.3%)}100%{transform:translate(0,0)}}';
      document.head.appendChild(st);

      var corner = document.getElementById('tele-corner');
      corner.innerHTML = '<b>╟</b> BERYLISM ORGANISATION PARALUDAL\n' +
        '<b>╟</b> canal ouvert · réception seule';

      this.el = mtl;
      this.gps = mtl.querySelector('#tl-gps');
      this.clock = mtl.querySelector('#tl-clock');
      this.corner = corner;
    },

    reveal: function (delay) {
      var self = this;
      setTimeout(function () {
        self.el.classList.add('in', 'glitching');
        self.corner.classList.add('in');
        setTimeout(function () { self.el.classList.remove('glitching'); }, 430);
      }, delay || 0);
    },

    tick: function (time) {
      if (!this.built) return;
      var d = new Date();
      function p(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
      this.clock.textContent =
        d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' +
        p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) +
        '.' + p(d.getUTCMilliseconds(), 3) + ' UTC';

      var dr = Math.sin(time * 0.31) * 4.2, dr2 = Math.cos(time * 0.23) * 3.7;
      this.gps.textContent =
        '23°26\'' + (21.4 + dr).toFixed(1) + '"N  11°09\'' + (57.3 + dr2).toFixed(1) + '"W';
    }
  };

  /* ============================================================
     5. BOOT
     ============================================================ */

  function basePath() {
    var p = location.pathname.replace(/index\.html?$/i, '');
    p = p.replace(/dunes\/?$/i, '');
    if (p.charAt(p.length - 1) !== '/') p += '/';
    return p;
  }

  var App = {
    mode: 'ceremony',
    phase: 'idle',
    t0: 0,
    started: false,

    init: function () {
      this.mode = document.body.getAttribute('data-mode') || 'ceremony';
      Vessel.build();
      Zarqa.init();
      Consoles.build();

      var wp = document.getElementById('wallpaper');
      var css = getComputedStyle(document.documentElement).getPropertyValue('--wallpaper');
      if (css && css.trim() && css.trim() !== 'none') wp.classList.add('has-image');

      var self = this;
      window.addEventListener('resize', function () { Zarqa.resize(); Vessel.measure(); }, { passive: true });

      // drag to turn the world
      var dragging = false, lastX = 0;
      window.addEventListener('pointerdown', function (e) {
        if (self.phase !== 'dunes') return;
        dragging = true; lastX = e.clientX;
      });
      window.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var dx = e.clientX - lastX; lastX = e.clientX;
        Zarqa.spinV = dx * 0.010;
      });
      window.addEventListener('pointerup', function () { dragging = false; });

      if (this.mode === 'dunes' || REDUCED) {
        this.snapToDunes();
      } else {
        this.phase = 'rest';
        Vessel.main.addEventListener('click', function (e) {
          e.stopPropagation(); self.begin();
        });
        window.addEventListener('click', function () {
          if (self.phase !== 'fold') return;
          if (performance.now() / 1000 - self.tStart < 0.45) return;
          self.snapToDunes();
        });
        setTimeout(function () {
          if (self.phase === 'rest') document.getElementById('prompt').classList.add('on');
        }, 2400);
      }

      // periodic glitching
      setInterval(function () {
        if (REDUCED) return;
        if (Math.random() < 0.45) Vessel.glitch(90 + Math.random() * 130);
        Zarqa.glitch = 1;
        setTimeout(function () { Zarqa.glitch = 0; }, 90 + Math.random() * 120);
      }, 5200);

      this.t0 = performance.now() / 1000;
      this.loop();
    },

    begin: function () {
      if (this.phase !== 'rest') return;
      this.phase = 'fold';
      this.tStart = performance.now() / 1000;
      document.getElementById('prompt').classList.remove('on');
      Vessel.glitch(220);
    },

    snapToDunes: function () {
      this.phase = 'dunes';
      Vessel.setT(1);
      Vessel.setViscosity(0.012);
      Zarqa.fold = 1;
      var a = Zarqa.anchor();
      Vessel.place(a.x, a.y, 1);
      if (this.mode !== 'dunes') {
        try { history.replaceState({}, '', basePath() + 'dunes/'); } catch (e) { }
      }
      Consoles.reveal(this.mode === 'dunes' ? 320 : 120);
    },

    loop: function () {
      var self = this;
      var last = performance.now() / 1000;

      function frame() {
        var now = performance.now() / 1000;
        var dt = Math.min(now - last, 0.05); last = now;
        var time = now - self.t0;

        if (self.phase === 'fold') {
          var e = now - self.tStart;

          var mT = easeViscous(e / 2.30);
          Vessel.setT(mT);

          // the flesh yields hardest mid-fold
          var visc = 0.012 + Math.sin(clamp(e / 2.30, 0, 1) * Math.PI) * 0.105;
          Vessel.setViscosity(visc);

          Zarqa.fold = easeViscous((e - 0.75) / 2.60);
          Zarqa.glitch = clamp(Math.sin(clamp(e / 2.6, 0, 1) * Math.PI) * 0.8, 0, 1);

          var a = Zarqa.anchor();
          var settle = easeViscous((e - 1.30) / 2.00);
          Vessel.place(
            lerp(window.innerWidth / 2, a.x, settle),
            lerp(window.innerHeight / 2, a.y, settle),
            settle
          );

          if (e > 3.05 && !self.pushed) {
            self.pushed = true;
            try { history.replaceState({}, '', basePath() + 'dunes/'); } catch (err) { }
          }
          if (e > 3.80 && !self.revealed) {
            self.revealed = true; Consoles.reveal(0);
          }
          if (e > 4.60) { self.phase = 'dunes'; Zarqa.glitch = 0; }

        } else if (self.phase === 'rest') {
          Vessel.place(window.innerWidth / 2, window.innerHeight / 2, 0);
          var base = Vessel.hover ? 0.20 : 0.012;
          if (Vessel.glitching) base += 0.09;
          Vessel.setViscosity(base + Math.sin(time * 0.9) * 0.004);
          if (!REDUCED && Math.random() < 0.06) {
            Vessel.turb.setAttribute('seed', String(Math.floor(Math.random() * 100)));
          }

        } else {
          var a2 = Zarqa.anchor();
          Vessel.place(a2.x, a2.y, 1);
          var b2 = Vessel.hover ? 0.20 : 0.012;
          if (Vessel.glitching) b2 += 0.07;
          Vessel.setViscosity(b2);
        }

        Zarqa.render(time, dt);
        Consoles.tick(time);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { App.init(); });
  } else { App.init(); }

  window.BORG = { Vessel: Vessel, Zarqa: Zarqa, App: App };
})();
