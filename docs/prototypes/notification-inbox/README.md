# Notification inbox prototype

Throwaway primary source for [How should the notification inbox behave for each role?](https://github.com/marlonschlosshauer/c005/issues/4). No production implementation or notification provider integration. Verdict: **Variant C selected by the human**. Its split list/detail experience feels like the email channel, providing a shared design language across both channels. The canonical behavior and follow-up decisions are recorded in the linked issue resolution.

The question is which entry point, list/read flow, and preference presentation fit Cadence. Three structurally different variants live on the existing dashboard, preserving its loader and authentication. The real sidebar and dashboard provide context. On narrow screens the prototype hides the existing fixed-width sidebar to leave room for the inbox; this adaptation is gated to prototype previews. The prototype only appears in development when `variant=A`, `B`, or `C` is present.

## Run

From this branch/worktree:

```sh
npm run prototype:notifications
```

Open [the prototype](http://127.0.0.1:5174/dashboard?variant=A). If prompted, select a user and country through DevUI, then minimize DevUI. Use the floating arrows or keyboard left/right to change variants. On this machine the isolated worktree is `/tmp/c005-notification-inbox`; it shares installed dependencies with the main checkout and uses a separate copy of its SQLite database. A fresh checkout needs normal project dependency/database setup first.

| Variant                                        | Structure                                            | Question                                                         |
| ---------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| [A](http://127.0.0.1:5174/dashboard?variant=A) | Bell with compact panel above the existing dashboard | Is quick access enough without a dedicated inbox page?           |
| [B](http://127.0.0.1:5174/dashboard?variant=B) | Full-page chronological list                         | Does a spacious unified inbox make scanning and actions easiest? |
| [C](http://127.0.0.1:5174/dashboard?variant=C) | Split list and selected-message detail               | Is a reading pane useful enough to justify the extra surface?    |

## Try

- Switch the mock account scenario among Student, Instructor, Platform Admin, Team Admin, and Mixed roles. These are mock relationships for notification review; they do not change the logged-in account or authorize real actions.
- Open a notification, mark it unread again, filter Unread, or mark all as read. Simply opening the inbox does not mark everything read.
- Load older items. Four mock items are initially shown; the sample pool is intentionally small. The production page size is not decided here.
- Simulate a new event. It adds an unread item without changing existing read states; if in-app delivery for that type is off, no item is added. This button does not send email or create any real event.
- Preview loading, empty, and error states, including retry.
- Open Preferences. All included types default on in both channels. Buyer Purchase confirmations and Refund Request updates are locked on. Other types have independent channel controls applying across all courses.
- Expand Prototype state to inspect the full relevant state after an interaction or variant switch. All notification and preference state is held in memory and resets on reload. No preference server writes, jobs, email sends, or persisted read states are implemented.

Notification actions show a safe example destination preview instead of navigating/mutating actual product data. Sample content and destinations illustrate a reading flow; the content/destination decision ticket settles the final contract. The prototype does not implement provider failures, retention, delivery retries, history beyond mock pagination, or real live-update transport.

## Review outcome

The human selected C and completed the inbox-behavior discussion in [How should the notification inbox behave for each role?](https://github.com/marlonschlosshauer/c005/issues/4). That ticket holds the canonical resolution; this artifact is the primary source that informed it.

The original prototype is preserved as reviewed, including its alternative layouts and mock interactions. It is not an implementation of every final decision: its small sample pagination, narrow-screen stacked layout, inline preferences, and lack of real live updates must not be mistaken for the resolved production behavior. Follow the ticket when implementing, rather than promoting this throwaway code.

## Captured views

- [A desktop](variant-A.png), [B desktop](variant-B.png), [C desktop](variant-C.png)
- [A narrow](mobile-A.png), [B narrow](mobile-B.png), [C narrow](mobile-C.png)
- [Preferences](preferences.png)

## Verification

`npm run typecheck`, then `npm run test` (405 existing tests). Browser interaction checks cover variant switching, read/unread, mark all, arrivals, preferences, empty/error states, pagination, and narrow-screen rendering. No new automated test suite was added for this throwaway artifact.
