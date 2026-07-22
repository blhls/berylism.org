# berylism.org

This repository contains the source for [berylism.org](https://berylism.org),
maintained on behalf of the Berylism Organisation Paraludal (BOP).

Enquiries regarding BIA should be directed through the appropriate channel
on the site itself.

---

### Notice

This site sets no cookies, writes nothing to local or session storage, and
collects no analytics. It makes no request to any third party beyond the
font and library CDNs listed below. Nothing about a visitor is retained.

---

### Structure

```
index.html          landing
dunes/index.html    sahara zarqa
assets/borg.css     palette, crt layer, consoles
assets/borg.js      vessel, zarqa, consoles
```

Fonts are served by Google Fonts; the 3D layer uses three.js from a CDN.
Both are the only external requests the site makes.

### Dials

Every effect is a CSS custom property at the top of `assets/borg.css`:

```
--crt-scan   fixed scanlines
--crt-vhs    wide vhs banding
--crt-grain  grain
--crt-vig    vignette / edge curvature
--crt-sweep  slow sweep
--fisheye    barrel distortion on the 3D layer
```

The vessel's colour is `--ulbre`; `--bixbite` is the interface accent.
They are separate on purpose.

Set them to `0` to strip the layer.

To replace the wallpaper, add one line to `:root`:

```css
--wallpaper: url("../assets/your-file.jpg");
```

---

### Custom domain

1. Registrar DNS — four A records on the apex (host `@`):

   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

   and four AAAA records on `@`:

   ```
   2606:50c0:8000::153
   2606:50c0:8001::153
   2606:50c0:8002::153
   2606:50c0:8003::153
   ```

   plus one CNAME: host `www`, value `blhls.github.io`.
   Delete any pre-existing A / parking record on `@` first.

2. GitHub → repo → Settings → Pages → Custom domain → `berylism.org` → Save.
   This writes a `CNAME` file into the repo. Do not delete it.

3. Wait for the DNS check to pass, then tick **Enforce HTTPS**.
