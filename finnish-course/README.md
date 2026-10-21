Status: DRAFT

# Your first hour in Finland (Survival Finnish by Lumovo)

A static, no-build learning page. Plain HTML, CSS and vanilla JS. No external requests. It also works when `index.html` is opened directly from disk.

## Files

```
index.html               the whole page (all content is plain HTML, readable without JS)
assets/css/styles.css    styles and design tokens
assets/js/app.js         progress, quick checks, greeting tabs, checkout simulator, destination selector
data/destinations.js     window.LUMOVO_DESTINATIONS (loaded before app.js)
.nojekyll                tells GitHub Pages to skip Jekyll
```

## Host on GitHub Pages

1. Push the repository to GitHub.
2. Go to Settings -> Pages.
3. Under "Build and deployment", choose Source: Deploy from a branch.
4. Pick your branch and the `/docs` folder, then Save.
5. Your page appears at `https://<user>.github.io/<repo>/`.

All paths are relative, so any other static host works too.

## Add a destination

1. Open `data/destinations.js` and add an object to the `window.LUMOVO_DESTINATIONS` array, copying the `helsinki-central` entry:
   - `id`, `name`, `nameFi`
   - `taxiPhraseFi`, `taxiPhraseEn`, optional `taxiPhraseSay` (respelling)
   - `options`: one object per mode (`train`, `bus`, `taxi`) with `mode`, `labelFi`, `labelEn`, `recommended`, and any of `time`, `price`, `where`, `which`, `ticket`, `getOff`, `goodFor`, `tip`
   - `check`: an array of field names that should show a "check" badge (still being verified)
2. Values may use simple inline HTML (`<strong>`, `<em lang="fi">`).
3. The selector in step 2 lists every destination from the data. Finnish text needs native-speaker review before it is published.
4. `index.html` contains the Helsinki Central content statically (shown without JS). If you change that destination's data, update the matching HTML too.
