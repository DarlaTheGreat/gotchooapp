<img src="assets/gotchoo-mark.svg" width="64" alt="gotchoo logo">

# gotchoo

**Say it so it clicks.**

Your cross-cultural workplace coach. You know what you want to say. We’ll help you say it so it clicks with the person you’re talking to.

gotchoo (formerly Cultural Compass) helps people new to a workplace culture see the context behind a moment and understand how their words may be heard. It follows one loop: **Describe → Observe → Understand → Respond.**

Designed and built by [Daria Sur](https://www.dariasur.com).

## Two ways in

- **Build a plan:** set up once (home culture and workplace), describe a real moment, see the three biggest gaps for that situation, then get a plan with words to try, a reflection, a 48-hour experiment and practice role-plays.
- **Ask the coach:** one quick question, with tips and example prompts.

## How it works

1. **Gap engine (no AI).** Each country is a row of eight 1–7 scores in `data/cultural_dimensions.csv`. The app calculates the gap on each dimension, multiplies it by a scenario weight from `data/scenario_weights.json`, and ranks the top three. The learner’s own adjustments replace country averages.
2. **Coaching.** Only the top three gaps, their direction and the learner’s story go to the AI, which writes in an observational, non-judgmental voice.
3. **Demo mode.** With no coach service connected, the app still works: plans and coach answers come from built-in examples for each dimension and direction, clearly labeled as demo.

Frameworks: cultural dimensions paraphrased from Erin Meyer’s *The Culture Map*, team-safety ideas from Daniel Coyle’s *The Culture Code*, and Paulo Freire’s dialogic approach.

## Files

```
index.html                     The whole app (no build step)
config.js                      Settings: add your coach service address here
data/cultural_dimensions.csv   Country scores (add a row to add a country)
data/scenario_weights.json     How much each dimension matters per scenario
assets/gotchoo-mark.svg        Logo
netlify/functions/coach.mjs    Live AI coach (Netlify function)
.nojekyll                      Tells GitHub Pages to serve files as they are
```

## Deploy on Netlify (with live AI)

This version runs live Claude answers through a Netlify function, the same setup as the Cultural Compass site.

```
index.html                     The app
config.js                      Points the app to /api/coach
netlify/functions/coach.mjs    Calls Claude with your key (kept on the server)
netlify.toml                   Netlify settings
```

**Environment variables** (Netlify > Site configuration > Environment variables):

| Key | Value |
| --- | --- |
| `ANTHROPIC_API_KEY` | your Claude API key (mark it secret) |
| `ANTHROPIC_MODEL` | optional, default `claude-sonnet-5` |
| `ALLOWED_ORIGIN` | optional, your site address |

**Update an existing Netlify site connected to GitHub:** replace the files in that repository with these files and commit. Netlify redeploys automatically and keeps your existing API key.

**Update with the Netlify CLI:** in this folder run `netlify login`, `netlify link` (choose your site), then `netlify deploy --prod`.

Note: drag-and-drop deploys publish files only and skip the coach function, so use GitHub or the CLI.

## Editing the data

- **Add a country:** add a row to `data/cultural_dimensions.csv` with eight scores from 1 to 7.
- **Change what matters in a scenario:** edit the multipliers in `data/scenario_weights.json` (1 = normal).

Values are starting estimates, not facts about any person, and learners can adjust them.

## Privacy

- Nothing is stored on a server. The learner’s map, last plan and reflections stay in their browser.
- With the Worker, the API key stays on Cloudflare; the browser never sees it. The Worker only accepts requests from your site, limits input and answer length, and only coaches on workplace communication.
