/* ------------------------------------------------------------------
   YOUR WORKS LIVE HERE.
   Add a new { ... } block to WORKS for every piece you publish.

   slug      short id used in the link (letters, numbers, hyphens)
   title     shown on the index and the reading page
   form      "poem" or "prose"   (poems keep your line breaks exactly)
   year      shown next to the title
   text      the piece itself, between backticks ` `.
             Leave one empty line between stanzas / paragraphs.
             (If your text contains a backtick, write it as \` )

   immersive  settings for the diary mode — every one is optional
     LOOK
     font       any Google Fonts family name, e.g. "La Belle Aurore"
     fontUrl    OR a font file you put in assets/fonts/ (e.g. "assets/fonts/mine.woff2")
     size       text size, e.g. "2.4rem"
     paper      page colour          ink    ink colour
     music      "assets/audio/your-track.mp3"  (your own file, loops)
                or a built-in mood: "synth:candlelight", "synth:rain", "synth:musicbox"

     PHRASES
     minWords   fewest words in a phrase                    (default 2)
     maxWords   most words in a phrase                      (default 3)
     breakAtPunctuation   true = a phrase ends at , . ; : ! ? —   (default true)
                false = split purely by word count
                (phrases never run across a line break in a poem, so a
                 short line can make a shorter phrase)

     TIMING  (all in seconds)
     write      how long a phrase takes to be written in, left to right   (default 2.5)
     gap        pause after a phrase is complete, before the next begins  (default 3)
     breath     extra pause between stanzas / paragraphs                  (default 1.5)
     keep       how many phrases stay on the page at once. When a new one
                completes and there are more than this, the oldest fades.
                keep: 3 = a phrase fades once two more have appeared       (default 3)
     fade       how long a phrase takes to fade back into the paper       (default 1.8)
     pace       multiplies ALL the timings above: 0.8 = a bit faster,
                1.5 = slower                                               (default 1)

   Anything you leave out comes from DIARY below (your site-wide defaults),
   and anything left out there falls back to the defaults listed above.
------------------------------------------------------------------- */

window.SITE = {
  name: "modsquareunderroot",
  blurb: "Prose and poetry, written by hand and broadcast late at night."
};

/* Site-wide diary defaults. Change these to change every piece at once;
   a piece's own immersive settings still win. */
window.DIARY = {
  minWords: 2,
  maxWords: 3,
  breakAtPunctuation: true,
  write: 2.5,
  gap: 3,
  breath: 1.5,
  keep: 3,
  fade: 1.8
};

window.WORKS = [
  {
    slug: "channel-nine",
    title: "Channel Nine, After Midnight",
    form: "poem",
    year: 2026,
    immersive: {
      font: "Italianno",
      size: "2.9rem",
      paper: "#d9d7d0",
      ink: "#17120f",
      music: "synth:musicbox",

      // phrases
      minWords: 2,
      maxWords: 3,
      breakAtPunctuation: true,

      // timing (seconds)
      write: 2.5,
      gap: 3,
      breath: 2,
      keep: 3,
      fade: 2
    },
    text: `the set hums a blue it learned from the sea,
and I sit cross-legged on the cold floor
waiting for your face to resolve
out of the snow.

somewhere a station is still broadcasting
a waltz nobody asked for.
I turn the dial the way you'd turn
a ring on a finger, slowly, to feel it.

if the future is anything
let it be this: static,
then a voice,
then the voice is yours.`
  },

  {
    slug: "biscuit-tin",
    title: "Letters Kept in a Biscuit Tin",
    form: "prose",
    year: 2026,
    immersive: {
      font: "La Belle Aurore",
      size: "2.4rem",
      paper: "#dcd9d1",
      ink: "#1d1612",
      music: "synth:rain",

      // longer phrases and a quicker rhythm suit prose
      minWords: 3,
      maxWords: 5,
      write: 2,
      gap: 2.5,
      keep: 2
    },
    text: `My grandmother kept her letters in a biscuit tin, the blue kind with a painted windmill on the lid. When the monsoon came the tin rusted at the hinges, and the paper inside took on the smell of rain and cardamom, which is to say it smelled like her.

I opened it only once. The handwriting leaned forward as if it were in a hurry to arrive somewhere, and every letter began the same way: not with a name, but with the weather. It rained again today. The sky is the colour of an old spoon. The trains are late but the mangoes are early.

I think she believed that if you told someone exactly what the sky looked like, they would be standing under it with you. I have been trying to write that way ever since.`
  },

  {
    slug: "ink",
    title: "Ink",
    form: "poem",
    year: 2025,
    immersive: {
      font: "Pinyon Script",
      size: "2.6rem",
      paper: "#cfd6da",
      ink: "#101418",
      music: "synth:candlelight",

      // one line at a time, slowly, and nothing fades until the end
      minWords: 5,
      maxWords: 8,
      write: 3.5,
      gap: 3.5,
      keep: 4,
      fade: 3
    },
    text: `write me down
the way rain writes a window:
quickly, and then all at once,
and then not at all.`
  }
];
