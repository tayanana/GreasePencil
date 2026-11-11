# Reflection

This note is about the software. The oral also asks for personal learning. A short list of prompts is at the end. Answer those in your own words. Do not read this file out as if it were a diary you wrote.

## Did the build meet the goal?

The goal was the accepted Task 2 concept: a web application that helps DIY mechanics, car enthusiasts, and independent garage operators keep intervals, OEM part numbers, and repair history, demonstrated on a Mercedes-Benz W203 with an M271 engine, and built in the shape the course asks for: a React single-page app, an API, tests, and Docker Compose.

That goal is met for one viewer and a handful of cars.

- The board, the garage, the vehicle, and the catalogue are separate routes.
- The status of an interval is a pure function with unit tests, and the API test drives the story the oral can show: an oil interval goes overdue, a logged job clears it.
- Compose starts two containers. The API data sits on a volume.
- The sample bay is specific. Oil is about 200 km and about a month past the owner interval. Brake fluid is past two years. Plugs are two catalogue rows, not one invented number.

It is not met if the goal is read as "the app knows the correct Mercedes service schedule." It does not. The intervals are whatever the owner saves. The sample numbers are a starting catalogue with the limits written next to them. There is no connection to the car's own service computer.

## What is weak

- Deleting a service record does not move the interval back. The screen says so. It is still easy to get the board and the history out of step.
- A job cannot be edited. You delete it and enter it again, and the delete does not undo the interval.
- The parts total is the sum of the lines. There is no separate "I spent this much but I did not itemise it" field except labour.
- PGlite locally and Postgres when a host sets `DATABASE_URL` is a second storage path. Both use the same SQL files, and the tests run on PGlite. A migration that one engine accepts and the other rejects would slip through.
- The container process starts as root only long enough to give the data volume to the `node` user. That is better than serving as root, and it is still a detail to explain rather than a hardened image.

## What the tests actually lock

They lock the status boundaries, the oil-job path, a negative odometer, a search for `%` that must not become a wildcard, owner isolation, part-number formatting, and the route from the board to the catalogue. They do not click every dialog. A browser pass is still worth doing before you rely on a demo.

## Practical conclusions

Keep the due rule out of the React components. The oral can point at `assessInterval` and the test table instead of a page that hides the rule in JSX.

Treat catalogue data as data with a source and a limit. The spark-plug split is the example: the first version of the requirement ("the plug for an M271") was wrong, and the backlog had to grow a second row.

Say the limits in the interface, not only in a document. The footer and the part notes are doing that work so a demo does not look like an order form.

## Prompts for the personal part of the oral

Answer these from the work you actually did. A sentence or two each is enough.

1. Which part took longer than you expected, and what did you cut because of that?
2. Where did a requirement change after you had already written code?
3. What would you do in the first hour if you started this project again?
4. What will you keep doing on the next piece of software, and what will you stop doing?
