# Concept

## Approved concept

This is the Task 2 concept accepted for DLBSEPPSD01_E. Greasepencil is a DIY garage and auto maintenance tracker for Tayanana Zifamba (3220254).

DIY mechanics, car enthusiasts, and independent garage operators lose maintenance intervals, OEM part numbers, and repair history across vehicle systems. Paper logs get ruined in the garage. A generic note has no structured fields for that data.

The app gives them one dashboard for repair entries, the remaining life of a component, technical notes, and part numbers. A responsive web app opens on a laptop at the bench and on a phone under the hood. The API keeps that garage in one place, so both devices read the same records.

## Where that concept lives in the software

| Approved claim | Where it is |
| --- | --- |
| Structured dashboard | The board: needs work, coming up, on track, and the attention list |
| Detailed repair entries | A service log with date, odometer, notes, who did the job, and part lines |
| Lifespan of a component | An interval by distance, months, or both, classified by `assessInterval` |
| History across systems | Each interval and part has a category: engine, fluids, filters, brakes, ignition, cooling |
| Technical notes and part numbers | Notes on the vehicle, the interval, the part, and the job. The catalogue is searchable |
| Laptop and phone | The same routes, with a layout that stacks on a narrow screen |
| Records kept in one backend | Express under `/api`. A published copy uses Postgres, so the garage is not stuck on one computer |

One signed-in person owns the garage. An independent operator uses that garage for several cars. Invoices, ramp booking, and several staff editing one garage are outside the accepted concept.

## Why a web application

The bench is a laptop and the work under the hood is a phone. Both already have a browser, so the same board does not need a store listing. The API is a separate container, which is also what the course task asks for, and it is what makes the two screens share one history.

## Worked example

The seeded bay is a 2005 Mercedes-Benz C 200 Kompressor.

- Chassis code: W203
- Engine stamp used in the sample: M271.940, one code in the M271 family
- Odometer: 186 420 km

The sample intervals are owner settings for the demonstration, not the car's ASSYST message and not a quote from the owner's manual. On a fresh garage the oil service is about 200 km and about a month past a 10 000 km / 12 month rule, and the brake fluid is past a 24 month rule. Cabin filter and front pads are inside the warning window. Air filter, spark plugs, and coolant are still on track.

Part numbers in that catalogue were taken from published Mercedes-Benz and MANN-FILTER / NGK listings for this chassis and engine family. Spark plugs are stored as two rows because NGK splits them at engine number 30 853 899 / 30 853 900. The cabin filter note says that right-hand-drive and left-hand-drive cars, and THERMATIC and THERMOTRONIC, do not all take the same element. The app repeats that warning in the interface. See the reference list on the slides.

## Requirements that the build meets

- Create, edit, and delete vehicles, with chassis code, engine code, and odometer.
- Attach intervals with a distance, a number of months, or both, plus an optional part number.
- Compute overdue, due now, due soon, on track, or no history from the odometer and the calendar.
- Record a DIY or shop job, with parts lines, and move the linked interval only when the job is the latest one.
- Keep a parts catalogue that can be searched and tied to a vehicle.
- Run as a React single-page app with routes for the board, the garage, a vehicle, and the catalogue.
- Expose those actions as a JSON API.
- Cover the status rules and the main API path with unit and integration tests, and the board-to-catalogue navigation with a frontend integration test.
- Run the SPA and the API as two Docker containers from one Compose file.

## Out of scope

Live lookup in a dealer parts system, reading the car's service computer, push reminders, photos of receipts, and several people editing one garage. A published copy separates viewers. It does not add a sharing feature inside a garage.
