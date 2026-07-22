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

     all four triangles wind the same way and never invert across
     the morph, so fill-rule:nonzero unions them into one solid
     body — overlaps merge instead of cutting holes.
     ============================================================ */

  var VB = { x: -2.2, y: -2.35, w: 4.4, h: 4.4 };

  var REST = [
    /* apex-piece  */[[-0.496, -1.615], [0.491, -1.615], [0.000, -0.959]],
    /* left wing   */[[-1.478, -1.050], [-0.427, -1.050], [-0.953, -0.270]],
    /* right wing  */[[0.427, -1.050], [1.474, -1.050], [0.953, -0.270]],
    /* the spike   */[[-0.500, -1.050], [0.500, -1.050], [0.000, 1.614]]
  ];

  // configuration A — idle, profile, sail to starboard.
  // the three equilaterals lay themselves down-up-down and share
  // their edges, so the hull closes into a flat-bottomed trapezoid.
  // the spike stands up and becomes the sail.
  var SHIP_A = [
    /* belly, inverted */[[-0.620, 1.280], [0.000, 0.500], [0.620, 1.280]],
    /* port            */[[-1.300, 0.500], [0.000, 0.500], [-0.620, 1.280]],
    /* starboard       */[[0.000, 0.500], [1.300, 0.500], [0.620, 1.280]],
    /* the sail        */[[-0.200, -2.100], [0.980, 0.170], [-0.320, 0.500]]
  ];

  var F_REST_Y = (0.000 - VB.y) / VB.h;
  var F_SHIP_Y = (1.280 - VB.y) / VB.h;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function easeViscous(t) {
    t = clamp(t, 0, 1);
    var a = t * t * t * (t * (t * 6 - 15) + 10);
    var b = 1 - Math.pow(1 - t, 3);
    return a * 0.72 + b * 0.28;
  }

  function pathAt(t) {
    var d = '';
    for (var i = 0; i < 4; i++) {
      var r = REST[i], s = SHIP_A[i];
      for (var v = 0; v < 3; v++) {
        d += (v === 0 ? 'M' : 'L') +
          lerp(r[v][0], s[v][0], t).toFixed(4) + ' ' +
          lerp(r[v][1], s[v][1], t).toFixed(4);
      }
      d += 'Z';
    }
    return d;
  }

  /* ============================================================
     2. THE VESSEL
     ============================================================ */

  var Vessel = {
    t: 0, h: 0, hover: false, glitching: false,

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
      disp.setAttribute('scale', '0.018');
      disp.setAttribute('xChannelSelector', 'R');
      disp.setAttribute('yChannelSelector', 'G');

      filt.appendChild(turb); filt.appendChild(disp);
      defs.appendChild(filt); svg.appendChild(defs);

      var sh = document.createElementNS(NS, 'ellipse');
      sh.setAttribute('class', 'shadow');
      sh.setAttribute('cx', '0'); sh.setAttribute('cy', '1.31');
      sh.setAttribute('rx', '0'); sh.setAttribute('ry', '0.09');
      svg.appendChild(sh);

      var g = document.createElementNS(NS, 'g');
      g.setAttribute('filter', 'url(#flesh)');

      function mk(cls, fill, dx) {
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('class', cls);
        p.setAttribute('fill-rule', 'nonzero');
        if (fill) p.setAttribute('fill', fill);
        if (dx) p.setAttribute('transform', 'translate(' + dx + ',0)');
        return p;
      }
      this.gR = mk('ghost', '#F0345A', 0.045);
      this.gB = mk('ghost', '#0090A8', -0.045);
      this.main = mk('hull', null, 0);

      g.appendChild(this.gR); g.appendChild(this.gB); g.appendChild(this.main);
      svg.appendChild(g);
      this.wrap.appendChild(svg);

      this.svg = svg; this.shadow = sh; this.turb = turb; this.disp = disp;
      if (REDUCED) this.wrap.classList.add('no-motion');
      this.measure();
      this.setT(0);

      var self = this;
      this.main.addEventListener('pointerenter', function () {
        self.hover = true; self.wrap.classList.add('is-hover');
      });
      this.main.addEventListener('pointerleave', function () {
        self.hover = false; self.wrap.classList.remove('is-hover');
      });
    },

    measure: function () {
      this.h = this.wrap.getBoundingClientRect().height || 180;
    },

    setT: function (t) {
      this.t = t;
      var d = pathAt(t);
      this.main.setAttribute('d', d);
      this.gR.setAttribute('d', d);
      this.gB.setAttribute('d', d);
      this.shadow.setAttribute('rx', (1.25 * t).toFixed(3));
      this.shadow.setAttribute('opacity', (0.30 * t).toFixed(3));
      this.wrap.classList.toggle('is-rest', t < 0.02);
    },

    setViscosity: function (v) { this.disp.setAttribute('scale', v.toFixed(4)); },

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
     3. SAHARA ZARQA
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
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(mix(flatP, position, f),1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'varying vec2  vUv;',
    'varying vec3  vN;',
    'varying float vF;',
    'uniform float uTime, uFold;',
    'uniform vec3  cAby, cTyr, cInd, cPet, cAqu;',

    'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
    'float noise(vec2 p){',
    '  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),',
    '             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);',
    '}',

    'void main(){',
    '  float w = sin(vUv.x*14.0 + uTime*0.040)*0.019',
    '          + sin(vUv.x*31.0 - uTime*0.026)*0.010',
    '          + sin(vUv.x*61.0 + uTime*0.017)*0.004',
    '          + noise(vUv*5.0)*0.024;',
    '  float band = fract(vUv.y*40.0 + w*40.0);',
    '  float ridge = smoothstep(0.0,0.78,band)*(1.0-smoothstep(0.80,1.0,band));',
    '  float fine  = noise(vUv*vec2(190.0,95.0))*0.06;',
    '  float h = clamp(ridge*0.94 + fine, 0.0, 1.0);',

    '  vec3 L = normalize(vec3(-0.32,0.70,0.64));',
    '  float lam = clamp(dot(vN,L),0.0,1.0);',
    '  float lit = clamp(h*0.54 + lam*0.48, 0.0, 1.0);',

    '  vec3 c = cAby;',
    '  c = mix(c, cTyr, smoothstep(0.00,0.20,lit));',
    '  c = mix(c, cInd, smoothstep(0.40,0.70,lit));',
    '  c = mix(c, cPet, smoothstep(0.66,0.88,lit));',
    '  c = mix(c, cAqu, smoothstep(0.91,1.00,lit)*0.48);',

    '  float rim = pow(1.0 - clamp(dot(vN,vec3(0.0,0.0,1.0)),0.0,1.0), 3.0);',
    '  c += cPet * rim * 0.14 * vF;',

    '  vec3 flatc = mix(cAby, cTyr, 0.86 + noise(vUv*38.0)*0.09);',
    '  gl_FragColor = vec4(mix(flatc, c, vF), 1.0);',
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
    '  gl_FragColor = vec4(cR.r, cG.g, cB.b, max(cG.a,max(cR.a,cB.a)));',
    '}'
  ].join('\n');

  var POST_V = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';

  var Zarqa = {
    ok: false, R: 2.30, CY: -2.35,
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
        uFlatC: { value: new THREE.Vector3(0, 0, 0) },
        cAby: { value: C(0x1C0620) }, cTyr: { value: C(0x510B47) },
        cInd: { value: C(0x24327A) }, cPet: { value: C(0x00718C) },
        cAqu: { value: C(0x7FE6E0) }
      };

      var small = Math.min(window.innerWidth, window.innerHeight) < 760;
      var geo = new THREE.SphereGeometry(this.R, small ? 110 : 180, small ? 70 : 120);
      this.globe = new THREE.Mesh(geo, new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG,
        uniforms: this.uni, side: THREE.DoubleSide
      }));
      this.globe.position.set(0, this.CY, 0);
      this.scene.add(this.globe);

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

      this.apex = new THREE.Vector3(0, this.CY + this.R - 0.02, 0);
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

      var dist = this.cam.position.distanceTo(this.lookAt);
      var vh = 2 * dist * Math.tan((this.cam.fov * Math.PI / 180) / 2);
      this.uni.uFlat.value.set(vh * this.cam.aspect * 1.35, vh * 1.35);
      this.uni.uFlatC.value.set(
        this.lookAt.x - this.globe.position.x,
        this.lookAt.y - this.globe.position.y,
        this.lookAt.z - this.globe.position.z
      );
    },

    anchor: function () {
      if (!this.ok) return { x: window.innerWidth / 2, y: window.innerHeight * 0.36 };
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
      this.globe.rotation.y = (this.spin + time * 0.005) * (this.fold * this.fold);

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
  var CORRUPT = '▚▓█▒░╳¤§'.split('');

  function glitterBlock(rows, cols) {
    var s = '', seq = GLIT.split(' ');
    for (var r = 0; r < rows; r++) {
      var line = '';
      for (var c = 0; c < cols; c++) line += seq[(r * 7 + c * 3 + ((r * c) % 5)) % seq.length] + ' ';
      s += line + '\n';
    }
    return s;
  }

  function shell(id, title, inner, closable) {
    var el = document.createElement('div');
    el.className = 'mtl'; el.id = id;
    el.innerHTML =
      '<div class="mtl-ghost" aria-hidden="true"><span></span></div>' +
      '<div class="mtl-win">' +
      '<div class="mtl-bar"><span>' + title + '</span>' +
      (closable ? '<button class="mtl-x" aria-label="close">×</button>'
        : '<span class="dots">// // //</span>') +
      '</div><div class="mtl-body">' + inner + '</div></div>';
    var sp = el.querySelector('.mtl-ghost span');
    sp.textContent = glitterBlock(46, 38);
    sp.style.animation = 'glitterdrift 26s linear infinite';
    if (closable) {
      el.querySelector('.mtl-x').addEventListener('click', function () {
        el.classList.remove('in');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
      });
    }
    return el;
  }

  var Consoles = {
    built: false, BEARING: '23\u00B0XY\'YX.X"N   11\u00B0YX\'XY.X"W',

    build: function () {
      if (this.built) return;
      this.built = true;
      this.host = document.getElementById('consoles');

      var st = document.createElement('style');
      st.textContent =
        '@keyframes glitterdrift{0%{transform:translate(-33.3%,-33.3%)}100%{transform:translate(0,0)}}';
      document.head.appendChild(st);

      this.notice = shell('c-notice', 'BOP',
        '<p class="mtl-crest">✫ ･ ﾟ ✴ ꨄ ✧ ･ ﾟ ✦ ✩ ♡ ⋆ ✿ ☆</p>' +
        '<h1 class="mtl-title" data-text="Notice">Notice</h1>' +
        '<button class="mtl-alert" id="hole-btn">your sail has a hole</button>' +
        '<hr class="mtl-rule">' +
        '<dl class="mtl-tele">' +
        '<dt>time</dt><dd id="tl-clock">--</dd>' +
        '<dt>bearing</dt><dd id="tl-gps">--</dd>' +
        '</dl>', false);
      this.host.appendChild(this.notice);

      this.clock = this.notice.querySelector('#tl-clock');
      this.gps = this.notice.querySelector('#tl-gps');

      var self = this;
      this.notice.querySelector('#hole-btn')
        .addEventListener('click', function () { self.openHelp(); });

      document.getElementById('tele-corner').textContent =
        '\u256F BERYLISM ORGANISATION PARALUDAL';
    },

    openHelp: function () {
      if (document.getElementById('c-help')) return;
      var self = this;
      var el = shell('c-help', 'ASK FOR HELP',
        '<textarea class="mtl-input" id="help-text" rows="4" spellcheck="false"></textarea>' +
        '<div class="mtl-actions"><button class="mtl-send" id="help-send">TRANSMIT</button></div>',
        true);
      this.host.insertBefore(el, this.notice);
      requestAnimationFrame(function () { el.classList.add('in', 'glitching'); });
      setTimeout(function () { el.classList.remove('glitching'); }, 430);
      el.querySelector('#help-send').addEventListener('click', function () {
        el.classList.remove('in');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 380);
        self.ack();
      });
    },

    ack: function () {
      var old = document.getElementById('c-ack');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var el = shell('c-ack', 'TRANSMISSION',
        '<p class="mtl-ack">your call for help has been transmitted</p>' +
        '<p class="mtl-sub">✫ ･ ﾟ ✴ ꨄ ✧ ･ ﾟ ✦ ✩ ♡ ⋆ ✿ ☆</p>', true);
      this.host.insertBefore(el, this.notice);
      requestAnimationFrame(function () { el.classList.add('in', 'glitching'); });
      setTimeout(function () { el.classList.remove('glitching'); }, 430);
    },

    hide: function () {
      ['c-help', 'c-ack'].forEach(function (id) {
        var n = document.getElementById(id);
        if (n) { n.classList.remove('in'); if (n.parentNode) n.parentNode.removeChild(n); }
      });
      this.notice.classList.remove('in');
      document.getElementById('tele-corner').classList.remove('in');
    },

    reveal: function (delay) {
      var self = this;
      setTimeout(function () {
        self.notice.classList.add('in', 'glitching');
        document.getElementById('tele-corner').classList.add('in');
        setTimeout(function () { self.notice.classList.remove('glitching'); }, 430);
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

      // the bearing never resolves. it only degrades differently.
      if (Math.floor(time * 3) !== this._bslot) {
        this._bslot = Math.floor(time * 3);
        var a = this.BEARING.split('');
        var n = Math.random() < 0.35 ? 2 : 1;
        for (var i = 0; i < n; i++) {
          var k = Math.floor(Math.random() * a.length);
          if (a[k] !== ' ') a[k] = CORRUPT[Math.floor(Math.random() * CORRUPT.length)];
        }
        this._btext = a.join('');
      }
      this.gps.textContent = this._btext || this.BEARING;
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
    mode: 'ceremony', phase: 'idle', t0: 0,

    init: function () {
      this.mode = document.body.getAttribute('data-mode') || 'ceremony';
      Vessel.build();
      Zarqa.init();
      Consoles.build();

      var wp = document.getElementById('wallpaper');
      var css = getComputedStyle(document.documentElement).getPropertyValue('--wallpaper');
      if (css && css.trim() && css.trim() !== 'none') wp.classList.add('has-image');

      var self = this;
      window.addEventListener('resize', function () {
        Zarqa.resize(); Vessel.measure();
      }, { passive: true });

      var dragging = false, lastX = 0, downX = 0;
      this.dragged = false;
      window.addEventListener('pointerdown', function (e) {
        self.dragged = false;
        if (self.phase !== 'dunes') return;
        if (e.target.closest && e.target.closest('.mtl')) return;
        dragging = true; lastX = downX = e.clientX;
      });
      window.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var dx = e.clientX - lastX; lastX = e.clientX;
        if (Math.abs(e.clientX - downX) > 6) self.dragged = true;
        Zarqa.spinV = dx * 0.008;
      });
      window.addEventListener('pointerup', function () { dragging = false; });

      // the body is the only control. it opens the world and it closes it.
      Vessel.main.addEventListener('click', function (e) {
        e.stopPropagation();
        if (self.dragged) return;
        if (self.phase === 'rest') self.begin();
        else if (self.phase === 'dunes') self.beginRefold();
      });
      window.addEventListener('click', function () {
        if (self.phase !== 'fold') return;
        if (performance.now() / 1000 - self.tStart < 0.45) return;
        self.snapToDunes();
      });

      if (this.mode === 'dunes' || REDUCED) {
        this.snapToDunes();
      } else {
        this.phase = 'rest';
      }

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
      this.pushed = false; this.revealed = false;
      Vessel.glitch(220);
    },

    // the world folds back into the glyph and you are returned to the start
    beginRefold: function () {
      if (this.phase !== 'dunes') return;
      this.phase = 'unfold';
      this.tStart = performance.now() / 1000;
      this.popped = false;
      Zarqa.spinV = 0; Zarqa.spin = 0;
      Consoles.hide();
      Vessel.glitch(240);
    },

    snapToDunes: function () {
      this.phase = 'dunes';
      Vessel.setT(1); Vessel.setViscosity(0.018);
      Zarqa.fold = 1;
      var a = Zarqa.anchor();
      Vessel.place(a.x, a.y, 1);
      if (this.mode !== 'dunes') {
        try { history.replaceState({}, '', basePath() + 'dunes/'); } catch (e) { }
      }
      Consoles.reveal(this.mode === 'dunes' ? 320 : 120);
    },

    loop: function () {
      var self = this, last = performance.now() / 1000;

      function frame() {
        var now = performance.now() / 1000;
        var dt = Math.min(now - last, 0.05); last = now;
        var time = now - self.t0;

        if (self.phase === 'fold') {
          var e = now - self.tStart;
          Vessel.setT(easeViscous(e / 2.30));
          Vessel.setViscosity(0.018 + Math.sin(clamp(e / 2.30, 0, 1) * Math.PI) * 0.115);
          Zarqa.fold = easeViscous((e - 0.75) / 2.60);
          Zarqa.glitch = clamp(Math.sin(clamp(e / 2.6, 0, 1) * Math.PI) * 0.8, 0, 1);

          var a = Zarqa.anchor();
          var settle = easeViscous((e - 1.30) / 2.00);
          Vessel.place(
            lerp(window.innerWidth / 2, a.x, settle),
            lerp(window.innerHeight / 2, a.y, settle), settle);

          if (e > 3.05 && !self.pushed) {
            self.pushed = true;
            try { history.replaceState({}, '', basePath() + 'dunes/'); } catch (err) { }
          }
          if (e > 3.80 && !self.revealed) { self.revealed = true; Consoles.reveal(0); }
          if (e > 4.60) { self.phase = 'dunes'; Zarqa.glitch = 0; }

        } else if (self.phase === 'unfold') {
          var u = now - self.tStart;
          var k = easeViscous(u / 2.30);
          Vessel.setT(1 - k);
          Vessel.setViscosity(0.018 + Math.sin(clamp(u / 2.30, 0, 1) * Math.PI) * 0.115);
          Zarqa.fold = 1 - easeViscous((u - 0.30) / 2.45);
          Zarqa.glitch = clamp(Math.sin(clamp(u / 2.5, 0, 1) * Math.PI) * 0.8, 0, 1);

          var au = Zarqa.anchor();
          var back = 1 - easeViscous(u / 2.05);
          Vessel.place(
            lerp(window.innerWidth / 2, au.x, back),
            lerp(window.innerHeight / 2, au.y, back), back);

          if (u > 1.90 && !self.popped) {
            self.popped = true;
            try { history.replaceState({}, '', basePath()); } catch (err) { }
          }
          if (u > 2.75) {
            self.phase = 'rest';
            self.mode = 'ceremony';
            Zarqa.fold = 0; Zarqa.glitch = 0;
            Vessel.setT(0);
          }

        } else if (self.phase === 'rest') {
          Vessel.place(window.innerWidth / 2, window.innerHeight / 2, 0);
          var base = Vessel.hover ? 0.24 : 0.018;
          if (Vessel.glitching) base += 0.10;
          Vessel.setViscosity(base + Math.sin(time * 0.8) * 0.006);

        } else {
          var a2 = Zarqa.anchor();
          Vessel.place(a2.x, a2.y, 1);
          var b2 = Vessel.hover ? 0.24 : 0.018;
          if (Vessel.glitching) b2 += 0.08;
          Vessel.setViscosity(b2 + Math.sin(time * 0.8) * 0.005);
        }

        // the body never stops moving. it is a liquid, not a logo.
        if (!REDUCED) {
          Vessel.turb.setAttribute('baseFrequency',
            (0.86 + Math.sin(time * 0.37) * 0.10).toFixed(3));
          if (Math.random() < 0.08) {
            Vessel.turb.setAttribute('seed', String(Math.floor(Math.random() * 100)));
          }
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
