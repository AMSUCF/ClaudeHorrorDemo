# Midnight Matinee 🎃

A classic horror movie recommendation tool with a retro picture-palace style.
Answer 20 questions and you get a bill of **3–5 classic horror films** (1920–1990) for your Halloween viewing.

## Features

- **20-question survey** shown as silent-film intertitles: era, black-and-white, subtitles, gore tolerance, scare level, monsters, setting, humour, pacing, viewing company, endings, runtime, favourite horror icons and more.
- **87 hand-tagged classics**, from *Nosferatu* and *Frankenstein* through Hammer, Corman/Poe, giallo, Japanese ghost stories and '70s grit to '80s VHS favourites.
- **Weighted matching**: every answer adds or subtracts points for tags such as `vampire`, `slowburn`, `gore3` or `family`. Each pick shows a "fright match" meter and the reasons it made your bill.
- **Retro cinema style**: chasing marquee bulbs, velvet curtains, a countdown leader, film grain, scratches and projector flicker, a film-strip progress bar and poster-style result cards. There's also an optional projector sound made with Web Audio.
- **The Bijou staff**: a grim reaper usher greets you at the box office, hosts each question with a gallows-humour aside, and presents your bill. A zombie heckler hangs off the marquee, peeks over the question cards, and rises from the grave after "Fin?". The clipart is in [`img/`](img/).
- **Shareable results**: the bill is saved in the URL (`#bill=…`), so you can send a link to your exact lineup.
- Works with the keyboard (press `1`–`7` to answer, `←` to go back), fits phone screens, and respects `prefers-reduced-motion`.

## Run locally

It's a plain static site with no build step:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, then pick your branch and the `/ (root)` folder.
4. Save. The site will appear at `https://<user>.github.io/<repo>/`.

All asset paths are relative and `.nojekyll` is included, so it works from a project subpath without any changes.

## Customising

- Films and questions live in [`js/data.js`](js/data.js). To add a film, give it `tags` from the vocabulary the questions use. Era, colour, language, gore, intensity, runtime and canon/deep-cut tags are derived automatically from its fields.
- Scoring and the UI are in [`js/app.js`](js/app.js); the styling is in [`css/style.css`](css/style.css).
