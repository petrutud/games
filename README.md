# Browser Games

A Hugo website showcasing HTML5 browser games, deployed on GitHub Pages.

## Theme

Uses [Hugo Profile](https://themes.gohugo.io/themes/hugo-profile/) by Gurusabarish.

## Local Development

```bash
# Install theme (if cloning fresh)
git submodule update --init --recursive

# Run development server
hugo server
```

## Adding Games

1. Add your game HTML/JS assets to `static/games/<game-name>/`
2. Add a new entry in `hugo.yaml` under `params.projects.items`
3. Add a screenshot to `static/images/games/`

## Deployment

The site is automatically deployed to GitHub Pages on push to `main` via the [Hugo workflow](.github/workflows/hugo.yml).
