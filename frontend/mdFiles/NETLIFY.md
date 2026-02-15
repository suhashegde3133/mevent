# Deploying PhotoFlow to Netlify (using dist)

This project builds with Create React App. To match a workflow where the publish directory is `dist/`, this repository contains a `netlify.toml` configured to publish `dist`.

Steps to deploy:

1. Build the project locally:

```powershell
npm run build
```

2. Copy the generated `build/` folder to `dist/` (the repository contains a `dist/` created locally; Netlify will use `dist/` as the publish folder):

```powershell
# remove previous dist then copy
Remove-Item -Recurse -Force dist; Copy-Item -Recurse -Force build dist
```

3. Push your repo to GitHub and create a new Netlify site from Git using the repo. The default `netlify.toml` in this repo sets:

- Build command: `npm run build`
- Publish directory: `dist`

4. Alternatively, deploy using Netlify CLI:

```powershell
npm i -g netlify-cli
netlify login
npm run build; Remove-Item -Recurse -Force dist; Copy-Item -Recurse -Force build dist; netlify deploy --dir=dist --prod
```

Notes:

- I built the project locally and created `dist/` by copying `build/` to `dist/`. If you prefer Netlify to run the build on their side and publish `build/`, change `publish = "dist"` to `publish = "build"` in `netlify.toml`.
- The current local build completed with ESLint warnings about unused variables in several files; these are warnings only and do not block the build.
- If you want me to re-apply the earlier lint fixes to eliminate those warnings, I can do that and re-run the build.
