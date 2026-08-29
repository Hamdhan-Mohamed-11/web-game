# Files that live on HostGator, not on the VPS

These are **not** served by this app. They are kept here so the version
running on shared hosting is in source control rather than only in cPanel.

## `events-panel/questions.html`

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

Exactly one line — the address the form posts to:

```diff
- const res = await fetch('submit.php', {
+ const res = await fetch('https://quiz.pickabook.lk/api/panel/questions', {
```

Everything else, including the inline base64 logo, is byte-for-byte the file
that was live. The response shape the page already checks for (`data.success`)
is unchanged, so no other edit is needed.

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
