# modsquareunderroot

A small static site for prose and poetry. There's no build step and nothing to install: it's plain HTML, CSS and JavaScript, so it runs on GitHub Pages as is.

```
index.html        the television (homepage)
works.html        list of every piece
work.html         one piece, with Read / Immerse modes
data/works.js     ← your writing goes here
css/style.css     all the styling
js/sound.js       music: the TV tune, the moods, your own audio files
js/home.js        the TV's static, knobs and switch-off
js/reader.js      reading view and the ink-on-paper diary mode
assets/audio/     put your music files here
assets/fonts/     (optional) your own font files
```

## Add a piece

Open `data/works.js` and copy one of the `{ ... }` blocks. Give it a new `slug`, write the piece between the backticks, and save. It shows up on the works page and gets its own link: `work.html#your-slug`.

- Poems keep your line breaks exactly. A blank line starts a new stanza.

## Set the music and font for Immerse mode

Inside each piece's `immersive` block:

| setting | what it does | example |
|---|---|---|
| `font` | any family from fonts.google.com | `"La Belle Aurore"` |
| `fontUrl` | or your own font file | `"assets/fonts/my-hand.woff2"` |
| `size` | text size | `"2.4rem"` |
| `paper`, `ink` | page and ink colour | `"#d9d7d0"`, `"#17120f"` |
| `music` | your own track, looped | `"assets/audio/rain-room.mp3"` |
| | or a built-in mood | `"synth:candlelight"`, `"synth:rain"`, `"synth:musicbox"` |

If an audio file is missing or won't play, the page quietly falls back to the candlelight mood.

The homepage tune is generated in the browser (see `tune:retro` in `js/sound.js`). To use a recording instead, change `Sound.play("tune:retro")` in `js/home.js` to `Sound.play("assets/audio/your-tune.mp3")`.

Use music you made or have the rights to. Free, properly licensed options: the YouTube Audio Library, Free Music Archive, Pixabay Music.

## Sound behaviour

Browsers don't allow a page to play sound until the visitor clicks or taps something, so the switch reads **Play sound** until that first click. After that it remembers the visitor's choice (on or off) across pages and visits.

## Publish on GitHub Pages

1. Create a repository on GitHub (for example `modsquareunderroot`) and upload everything in this folder, keeping the folders as they are.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute your site is live at `https://<your-username>.github.io/modsquareunderroot/`.

To try it on your own computer first, open a terminal in this folder and run `python3 -m http.server`, then visit `http://localhost:8000`.

## How Immerse mode plays

The piece arrives as short phrases, each written in left to right at a free spot on the page. Older phrases fade back into the paper as new ones arrive. You control all of this, for each piece separately, in its `immersive` block in `data/works.js`:

| setting | what it does | default |
|---|---|---|
| `minWords` | fewest words in a phrase | `2` |
| `maxWords` | most words in a phrase | `3` |
| `breakAtPunctuation` | `true` ends a phrase at a comma, full stop, etc.; `false` splits purely by word count | `true` |
| `write` | seconds a phrase takes to be written in | `2.5` |
| `gap` | seconds of pause after a phrase, before the next one starts | `3` |
| `breath` | extra seconds between stanzas or paragraphs | `1.5` |
| `keep` | phrases on the page at once; the oldest fades when a new one would make it more (`3` = a phrase fades once two more have appeared) | `3` |
| `fade` | seconds a phrase takes to fade away | `1.8` |
| `pace` | multiplies every timing above (`0.8` faster, `1.5` slower) | `1` |

To change the default for every piece at once, edit the `DIARY` block near the top of `data/works.js`. A piece's own settings always win over it.

In poems, phrases never run across a line break, so a short line can make a phrase shorter than `minWords`.

## Keyboard in Immerse mode

Space pauses, → or Enter finishes the current phrase (or skips the pause), Esc goes back to the reading view. Clicking the page does the same as →.
