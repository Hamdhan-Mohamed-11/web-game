# Files that live on HostGator, not on the VPS

These are **not** served by this app. They are kept here so the version
running on shared hosting is in source control rather than only in cPanel.

## `events-panel/` — upload both files

```
public_html/events/panel/questions.html
public_html/events/panel/logo.png
```

### `logo.png`

The Readers' Summit lockup with **powered by Zerostix**. The copy that was
live is the older mark without it, so this must be uploaded alongside the
HTML or the page will still show the old logo.

Also 840x462 and 47KB, against the 1027KB that was live. The page never
renders it wider than 280px, so the old file was sending roughly a megabyte
that no phone could use — worth having on venue wifi with 150 people
scanning at once. It is transparent, so it sits on the card's paper colour
without a baked-in white box.

### `questions.html`

Upload to HostGator at:

```
public_html/events/panel/questions.html
```

so it stays reachable at its printed address:

```
https://www.pickabook.lk/events/panel/questions.html
```

**That URL cannot change.** Around 150 QR codes were printed pointing at it.

### What changed from the version currently live

Two things. The `body` rule gained `flex-direction:column`, and the address
the form posts to:

```diff
  body{
    display:flex;
+   flex-direction:column;
    align-items:center;
```

`body` is a flex container, and row is the flex default, so `<footer>` was a
sibling flex **item** of `.card` sitting beside it rather than under it. On a
wide screen that put the credit line to the right of the card; on a 390px
phone it squeezed the card to 187px — under half the screen, three words per
line, the submit button overflowing its own box. Measured 187px → 354px after
the fix.

```diff
- const res = await fetch('submit.php', {
+ const res = await fetch('https://quiz.pickabook.lk/api/panel/questions', {
```

Everything else is byte-for-byte the file that was live. The response shape
the page already checks for (`data.success`) is unchanged, so no other edit is
needed, and the `<img src="logo.png">` reference is untouched — the new logo
arrives by replacing that file, not by editing the HTML.

### Why point it at the VPS at all

`submit.php` does answer, but its queue is only readable on HostGator, and
there was no moderator view. Sending to the VPS instead puts the questions in
the same database as the rest of the summit and gives the moderator a live
page at `https://quiz.pickabook.lk/panel` (admin passcode required).

`submit.php` can be left in place. Nothing calls it once this file is
uploaded, and leaving it costs nothing — but note it is still publicly
writable, so delete it if you would rather the old queue stopped collecting.

### The cross-origin part

The form is on `www.pickabook.lk` and the API is on `quiz.pickabook.lk`, so
the browser sends a preflight `OPTIONS` before the real `POST`. The API
answers it and echoes back only origins on an allow-list
(`pickabook.lk` and `www.pickabook.lk`, http and https).

If the page is ever moved to a different hostname, that allow-list in
`src/app/api/panel/questions/route.ts` has to be updated or every submission
will fail with a bare network error and nothing useful in the console.
