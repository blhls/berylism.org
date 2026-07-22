# berylism.org

This repository contains the source for [berylism.org](https://berylism.org),
maintained on behalf of the Berylism Organisation Paraludal (BOP).

Enquiries regarding BIA should be directed through the appropriate channel
on the site itself.

---

### Notice

This site sets no cookies, writes nothing to local or session storage, and
collects no analytics. Nothing about a visitor is retained between visits or
transmitted anywhere.

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

Set them to `0` to strip the layer.

To replace the wallpaper, add one line to `:root`:

```css
--wallpaper: url("../assets/your-file.jpg");
```
