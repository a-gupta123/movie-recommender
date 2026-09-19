# Movie Recommender

A small Flask web app that recommends movies from [The Movie Database (TMDB)](https://www.themoviedb.org/) based on genre, mood, minimum rating, and release year.

This project was built for a class assignment that requires a public API, user-controlled search filters, error handling, a README, and a prompt log.

**Live demo:** [https://a-gupta123.github.io/movie-recommender/](https://a-gupta123.github.io/movie-recommender/)

GitHub Pages can only host static files, so the live site is a same-feature HTML/CSS/JavaScript version in `docs/`. It still uses TMDB Discover. Paste your TMDB API key in the page once; it is stored in your browser, not in the repository. Run the Flask app locally for the Python version.

## Features

- Simple form inputs (no AI/LLM)
- TMDB Discover Movie search sorted by popularity
- 8 movie cards with poster, title, year, rating, and overview
- Friendly messages for empty input, no matches, network errors, invalid API responses, and a missing API key

## Project structure

```text
movie-recommender/
├── app.py
├── templates/
│   └── index.html
├── static/
│   └── style.css
├── docs/                # GitHub Pages static demo
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env                 # local API key (not committed)
├── .gitignore
├── requirements.txt
├── README.md
└── PROMPTS.md
```

## Get a TMDB API key

1. Create a free account at [https://www.themoviedb.org/signup](https://www.themoviedb.org/signup).
2. Sign in, open your profile menu, and go to **Settings**.
3. Open the **API** section.
4. Apply for an API key (choose the Developer option) and accept the terms of use.
5. Copy the **API Key (v3 auth)** value.

TMDB’s process works best on a desktop browser.

## Create the `.env` file

In the project root, create a file named `.env` with this line:

```env
TMDB_API_KEY=paste_your_real_key_here
```

Do not put quotes around the key unless they are part of the key itself. Do not commit `.env`; it is already listed in `.gitignore`.

## Install and run

Use Python 3.10 or newer.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

On Windows, activate the virtual environment with:

```bash
.venv\Scripts\activate
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000).

## GitHub Pages

Live demo: [https://a-gupta123.github.io/movie-recommender/](https://a-gupta123.github.io/movie-recommender/)

GitHub Pages cannot run Flask, so the hosted site is the static app in `docs/`. Paste your TMDB API key on the page once; it stays in your browser and is not stored in the repository.

## How it works

The form values are converted into TMDB Discover query parameters:

- Genre and mood become `with_genres` (comma = AND, pipe = OR)
- Minimum rating becomes `vote_average.gte`
- Year range becomes `primary_release_date.gte` / `primary_release_date.lte`
- Results are sorted with `sort_by=popularity.desc`
- Movies with fewer than 50 votes are excluded so obscure high scores do not dominate

Mood is a fixed mapping, not an AI model. For example, “Scary” maps to Horror or Thriller.

## Testing checklist

- **Normal search:** choose Comedy, Funny, rating 7+, and years 2015–2024, then click **Find Movies**. You should see about 8 posters with titles, years, ratings, and overviews.
- **Empty input:** submit the form with every field left on “Any” / blank. You should see a message asking for at least one filter, not a crash.
- **Invalid input:** type `abc` or `1800` in a year field, or make the start year later than the end year. You should see a short validation message.
- **No results:** try a narrow search such as Documentary, rating 8+, and a single old year that is unlikely to match. You should see a “no movies matched” message.
- **Missing API key:** temporarily rename or empty `TMDB_API_KEY` in `.env`, restart the app, and search. You should see a missing-key message.
- **Network failure:** turn off Wi-Fi (or disconnect from the internet), then search. You should see a connection error message instead of a traceback.

## Notes

This product uses the TMDB API but is not endorsed or certified by TMDB.
