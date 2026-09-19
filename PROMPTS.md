# Prompt log

AI (Cursor) was used as a helper for this class assignment, not as a replacement for understanding the project.

## What AI was used for

- Understanding TMDB’s public API, especially the Discover Movie endpoint, genre IDs, and query parameters such as `with_genres`, `vote_average.gte`, `vote_count.gte`, and `primary_release_date`.
- Generating a simple Flask starter: `app.py`, the HTML form, CSS, `.gitignore`, `requirements.txt`, and README structure.
- Mapping form fields (genre, mood, rating, year range) to TMDB filters without using an LLM at runtime.
- Debugging and improving error handling for empty input, no matching movies, invalid API responses, network failures, and a missing TMDB API key.
- Hosting a static version of the app on GitHub Pages, which cannot run Flask.
- Debugging why the live GitHub Pages site did not return movies, then fixing startup/script loading so searches work in the browser.

## What stayed student-owned

- The assignment requirements, tech stack, and scope (Flask + HTML/CSS, no React/database/auth).
- The decision to use dropdowns and a small mood-to-genre dictionary instead of an AI recommendation model.
- Reviewing the generated code so it stays readable enough to explain in class.
- Providing a TMDB API key locally in `.env` (not committed) and deciding the hosted form should not ask visitors for a key.
- Choosing GitHub Pages as the public demo URL.

## Chat log (this assignment)

This log summarizes the Cursor chat used to build and host the app.

1. **Build a Flask movie recommender with TMDB.**
   Prompt: create a class-assignment web app using the TMDB API, Flask, HTML/CSS, form filters (genre, mood, rating, year range), error handling, README, and a prompt log.
   Result: generated `app.py`, templates, CSS, `requirements.txt`, `.gitignore`, README, and this prompt log. Mood is a fixed genre mapping, not an AI model.

2. **Host it on GitHub Pages.**
   Prompt: host the project at `git@github.com:a-gupta123/movie-recommender.git`.
   Result: explained that GitHub Pages cannot run Flask; added a static HTML/JS version; pushed the repo; enabled a public demo at `https://a-gupta123.github.io/movie-recommender/`.

3. **Run it locally.**
   Prompt: host the app locally.
   Result: started the Flask app. Port 5000 was already used by macOS, so the local server runs at `http://127.0.0.1:8000`.

4. **Use a TMDB API key without a form field.**
   Prompt: the API key was placed in `.env`; later, do not ask visitors for a key, and make genre/mood/rating/year optional except that at least one filter is required.
   Result: Flask still loads the key from `.env`. The GitHub Pages form only shows the four filters and requires at least one.

5. **Fix GitHub Pages so it actually returns movies.**
   Prompt: the live site was not generating recommendations.
   Result: moved the static app to the repository root, made the search start after the page loads, and verified a live search returns movie cards.

The TMDB API key is not written in this file. Local Flask uses `.env`. The public Pages demo calls TMDB from the browser.
