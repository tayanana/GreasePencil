# Process model

Scrum is the process model for this project. The Scrum Guide describes a product backlog, a sprint goal, an increment, and a definition of done (Schwaber & Sutherland, 2020). Those pieces fit a garage tracker better than a single pass through a frozen specification, and better than a board with no end to an increment.

## Why Scrum

The awkward facts in this product showed up while building it, not before. Spark plugs for the M271 are not one part number. NGK's listing splits at an engine number. Cabin filters split on steering side and climate control. A waterfall plan that froze "the" oil-filter number and "the" plug in week one would have shipped a confident wrong catalogue. Scrum lets the next increment change the backlog when the catalogue says the requirement was too coarse.

A plain Kanban board would have kept the work flowing, but this course product needs a named increment you can review: foundation, then the garage itself, then the evidence (tests, containers, and this report). A sprint goal draws that line. Kanban does not have to.

The team is one person, so the ceremony is adapted and the adaptation is part of the choice:

- The same person orders the backlog and does the work. There is no separate product owner to negotiate with.
- There is no daily standup. A one-person standup is a note of what is blocked.
- The review is the oral report: the increment is demonstrated, and the reflection says what the increment does not do.
- The sprint length here is an increment of the build, not a claim that a multi-week calendar was held. The repository records the implementation. Put your real start and end dates on the title material before you present.

## Backlog

| Order | Item | Done when |
| --- | --- | --- |
| 1 | SPA shell with routes, Express app, Compose files, test runners | The app and the API start, and an empty test passes |
| 2 | Vehicles, intervals, status rule, parts, service log | The W203 sample shows overdue oil and brake fluid, and logging the oil job clears it |
| 3 | Tests, Docker entry, concept, architecture, this process note, slides | `npm test` passes, Compose is documented, the oral can point at a file |

## Definition of done

An item is done when the path works in the browser, the API rejects a bad body, a test locks the behaviour that the oral will claim, and the README or the docs still match the code. A status rule that exists only in the React page is not done, because the phone and the test would be free to disagree.

## Risks that the process had to carry

| Risk | What was done |
| --- | --- |
| Sample part numbers get ordered as if they were verified for every W203 | The UI and the concept say they are cross-references and name the checks (engine number, steering side, climate system) |
| One viewer's garage is readable by another | Queries filter on the verified viewer id. An integration test asks for another owner's vehicle and expects 404 |
| The due date flips at the wrong midnight | Today is calculated in `Africa/Harare` unless `APP_TIME_ZONE` is set |
| A cross-site form posts a change using the viewer's session | Mutating routes require a custom header that a plain form cannot set |

## What a second release would pick up first

Editing a log in place, rewinding an interval when the latest log is deleted, and a photo of the engine stamp next to the plug rows. Those were left out so the first increment stayed demonstrable.
