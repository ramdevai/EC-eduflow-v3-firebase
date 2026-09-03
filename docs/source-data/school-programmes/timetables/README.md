# Gundecha Education Academy — Career Primer Timetable

Source: 10 photographs of the school's physical timetable board (`IMG_6440.JPG`
through `IMG_6449.JPG`), taken 2026-08-31. The photos themselves are **not**
committed to this repository (see `.gitignore`) — they stay on the local
machine that transcribed them. This file is the transcription and is the
data actually seeded into `institutions` / `school_programmes` by
[`scripts/seed-local-firestore.mjs`](../../../../scripts/seed-local-firestore.mjs).

If the photos are needed again (re-verifying a slot, re-shooting a session
after a timetable change), ask whoever ran the original transcription, or
re-photograph the board at Gundecha Education Academy, Thakur Village,
Kandivali (East), Mumbai - 400101.

## Institution

| Field | Value |
| --- | --- |
| Name | Gundecha Education Academy |
| Campus | Thakur Village, Kandivali East |
| Address | Gundecha Education Academy, Thakur Village, Kandivali (East), Mumbai - 400101 |

## Classes

| Class ID | Grade | Division | Room | Class teacher |
| --- | --- | --- | --- | --- |
| `ix-ebony-713` | IX | Ebony | 713 | Sugana Karki |
| `ix-margosa-604` | IX | Margosa | 604 | Alpana Tripathy |
| `x-olive-614` | X | Olive | 614 | Divya Badalia |
| `ix-mint-613` | IX | Mint | 613 | Revathi Menon |
| `x-cinnamon-602` | X | Cinnamon | 602 | Renu Joshi |
| `x-maple-603` | X | Maple | 603 | Anukana Chakraborty |
| `ix-arnica-612` | IX | Arnica | 612 | Preeti Arora |
| `x-eucalyptus-704` | X | Eucalyptus | 704 | Rupa Mondal |
| `ix-mahagony-714` | IX | Mahagony | 714 | G. Banumathy |
| `x-rosewood-705` | X | Rosewood | 705 | Priyanka Singh |

## Weekly Life Skills period (career-primer slot)

One weekly slot per class, read directly off the photographed timetable.
`durationMinutes` varies because periods on the physical timetable are not
uniform length.

| Weekday | Grade | Division | Room | Time | Duration | Teacher | Source photo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Monday | IX | Ebony | 713 | 10:00–10:35 | 35 min | Sugana Karki | `IMG_6446.JPG` |
| Monday | IX | Margosa | 604 | 10:35–11:05 | 30 min | Alpana Tripathy | `IMG_6448.JPG` |
| Tuesday | X | Olive | 614 | 10:35–11:05 | 30 min | Divya Badalia | `IMG_6444.JPG` |
| Tuesday | IX | Mint | 613 | 11:05–11:35 | 30 min | Revathi Menon | `IMG_6449.JPG` |
| Wednesday | X | Cinnamon | 602 | 09:00–09:40 | 40 min | Renu Joshi | `IMG_6442.JPG` |
| Wednesday | X | Maple | 603 | 10:35–11:05 | 30 min | Anukana Chakraborty | `IMG_6441.JPG` |
| Wednesday | IX | Arnica | 612 | 12:35–13:05 | 30 min | Preeti Arora | `IMG_6445.JPG` |
| Thursday | X | Eucalyptus | 704 | 10:00–10:35 | 35 min | Rupa Mondal | `IMG_6440.JPG` |
| Thursday | IX | Mahagony | 714 | 10:35–11:05 | 30 min | G. Banumathy | `IMG_6447.JPG` |
| Thursday | X | Rosewood | 705 | 12:35–13:05 | 30 min | Priyanka Singh | `IMG_6443.JPG` |

All slots are named `Life Skills` on the timetable board. The seed script
projects this weekly pattern forward from 2026-09-01 through 2027-03-01 to
generate individual programme sessions.
