# MowerFix AI V1.3 Beta

Static GitHub Pages app.

## Features
- 15 priority mower models
- 25 diagnostic fault categories
- Exact error/message lookup for supported model families
- 54 manufacturer-verified part records with source links
- Unknown prices remain “Not verified”
- Anonymous browser-local feedback using localStorage
- “Was this diagnosis correct?” and actual-fault capture
- Small confidence tuning from repeated local tests (minimum 3 tests)
- Print/save diagnosis report

## Run
Open `index.html`, or run `python -m http.server 8000` in this folder.

## GitHub Pages
Upload all five files to a repository and enable Settings → Pages → Deploy from branch → main → /root.

## Data policy
Part numbers and compatibility records are only included when supported by manufacturer catalog/product documentation. Prices are left as `Not verified` unless a current manufacturer price was directly verified. Error-code entries summarize manufacturer documentation; the app does not reproduce repair manuals.

## Feedback storage
Feedback is stored in browser localStorage under `mowerfix_feedback_v13`. It never leaves the browser in this static build.
