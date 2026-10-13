# Grade 2 Orange

A small offline app (PWA) for the grade-2 French quiz on eleven greetings and polite words: spelling, saying them, and what they mean.
Same family as Muntaha's French Verbs: a pencil-drawn notebook page, now orange, with a little fox. All words on screen are English; every French word shows its English meaning and a picture.

The eleven words, exactly as the teacher wrote them: À lundi · Allô · Au revoir · À bientôt · Merci beaucoup · De rien · Désolé(e) · S'il vous plaît · Bonne chance · Bon week-end · Félicitations.

## How she uses it

- **Lessons** – eleven short video clips (20–70 s each) cut from children's YouTube videos, one card per lesson in order. Watch, tap the words under the video to hear them, then **Quick check** (3 questions on that lesson's words; 2 right = a tick). The last lesson has no video: De rien and Bonne chance are "with the fox" (hear, say three times, quick check) because no child-friendly video covers them.
- **Words** – the eleven word cards with pictures. Tap one: letters with the tricky ones glowing, a one-line tip, normal and slow audio, "sounds like", and when to say it.
- **Rules** – nine best-practice cards (hats on letters, the big À keeps its hat, é says 'ay', silent last letters, c says 's', the ' and the -, Bon or Bonne, girl or boy, say it well), each showing its words with the relevant letters glowing.
- **Practice** – no clock. Pick Everything / Spelling / Sounds / Meanings. Nine question kinds: type it (on-screen keyboard with é è ê à ô î ç ' -), pick the spelling, missing letter, build it (letter tiles), what does it mean, say it in French, listen (hear and pick), which sounds right (two clips, one with a common mistake), and say it (microphone when the browser has French speech recognition; otherwise an echo game). A wrong answer says "Not yet", shows the right one, lets her try again, and the word comes back a few questions later. A missing accent says "Nearly! Watch the accent."
- **Star Round** – 10 questions, no clock. 9 right = three stars, 7 = two, 5 = one. Microphone questions never appear in rounds. Shows what she missed, and the **quiz-ready** meter.
- **Sticker book** – one sticker per word, earned when the word has been spelled right 3 times, heard right 2 times, and its meaning picked 2 times (across lessons, practice and rounds). Also the quiz-ready meter, recent rounds, and **Export JSON**.

On the title page the app asks for the student's name once; it is kept on the device (IndexedDB `settings`), shown on the title page, the sticker book and round results, and can be changed by tapping it. The title page is signed "Designed by Anya Shaheryar".

**Quiz-ready** = two "Everything" rounds in a row with 9 or more right.

Everything she does is saved on the device (IndexedDB: `results` = every star round with per-question records, `attempts` = practice and lesson-check answers, `lessons` = watched / passed). Nothing leaves the device, except the microphone question, which uses the browser's own speech recogniser (Safari/Chrome; needs the internet).

## Changing the content

All content lives in `public/content/greetings.json` (words with tip, glowing letters, lookalike misspellings, wrong-sound clip; rules; lessons with their clip segments). Never edit the code for content. After editing it:

```
npm run test:sim     # validates the JSON shape and re-runs all checks
npm run audio        # makes clips for any new French text (existing files are skipped)
npm run clips        # cuts any new lesson clips from raw/ (existing clips are skipped)
```

## Lesson videos

Each lesson in the JSON names a YouTube video (`source.youtube`), its title and channel (shown under the player), and `segments` = `[[start, end], ...]` seconds to keep. `npm run clips` (`scripts/make-clips.mjs`) cuts them from `raw/<youtube id>.mp4` into `public/video/<name>.mp4` (480p, all under 25 MB so the whole app, videos included, works offline) plus a poster frame.

The raw videos were downloaded with yt-dlp from `~/Apps/yt-researcher/.venv` (`--extractor-args "youtube:player_client=android,web_safari"`); `raw/` and `public/video/` are git-ignored. To re-download one:

```
~/Apps/yt-researcher/.venv/bin/yt-dlp --extractor-args "youtube:player_client=android,web_safari" -f "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b" --merge-output-format mp4 -o "raw/%(id)s.%(ext)s" "https://www.youtube.com/watch?v=<id>"
```

Clips in use (all children's channels except the Bon week-end pronunciation guide): Blabber Beasts (Allô), A French Start (Au revoir, à bientôt), Bilingual Beats (Au revoir les copains), Eveiller mon enfant (S'il vous plaît, merci), DidiPop (Merci, oui oui, s'il vous plaît), La Bande à Shadi (the magic words), BoomBerry (Je suis désolé), Joyeux Anniversaire (Félicitations), French Pronunciation Guide (Bon week-end), FLE en vidéos (Bonjour lundi). The clips are for the student's own use; they are not committed to the public repository.

## Run it

```
export PATH=~/.local/node22/bin:$PATH
npm install
npm run dev          # http://localhost:5183 (also on the network address, for the tablet)
npm run test:sim     # headless tests (node + fake-indexeddb)
npm run build        # production build in dist/
npm run deploy       # build and publish dist/ to the gh-pages branch
```

`npm run deploy` pushes to the git remote named `origin`, so this folder needs `git init` and `git remote add origin <repo-url>` first (as with the other apps). Then turn on GitHub Pages for the `gh-pages` branch. Open the page once with internet, then it works offline. It uses relative paths (`base: './'`), so it works under any sub-folder. `public/gate.json` is a front door that can close the app (`blocked: true`) without a rebuild.

## Audio

`npm run audio` (`scripts/gen-audio.mjs`) makes one clip per French item: each word, each accepted spelling (Désolé and Désolée), and each "wrong sound" (Merci beaucoupe, S'il vous plaite, À bientote, De rienne, Dézol, Bon chance, Bonne week-end), named by a slug of the text (`merci_beaucoup.mp3`, see `src/core/audio.js`).
It uses ElevenLabs (voice `pFZP5JQG7iQjIQuC4Bku`, model `eleven_multilingual_v2`) with the key `ELEVENLABS_API_KEY` read from `~/Apps/video-factory/.env` (never printed). With no key, or with `--say`, it falls back to the macOS voice Thomas (`.m4a`). Existing clips are skipped. If a clip is missing the app uses the device's French speech voice.

## Icons

`npm run icons` redraws `public/icons/icon.svg` (orange page, fox) and renders `icon-192.png` / `icon-512.png` (macOS `sips`).

## Code map

- `src/core/` – no UI: `content.js` (derived views + validation), `questions.js` (balanced generator, nine types, focus and word filters), `check.js` (answer checker: accents, apostrophes, tiles, what the microphone heard), `scoring.js` (round summary, stars, stickers, quiz-ready), `storage.js` + `db.js` (IndexedDB), `audio.js` (slug + map), `rng.js`.
- `src/ui/` – React screens (`screens/`), components (`Pics.jsx` = fox and the eleven pictures, `QuestionView.jsx`, `Keyboard.jsx`, `Bits.jsx`, `Art.jsx`), `speech.js` (microphone), `audio.js` (player), `styles.css` (notebook look).
- `test/` – `content.mjs`, `check.mjs`, `questions.mjs` (600 questions: balance, no repeats, every type), `scoring.mjs`, `storage.mjs`.
