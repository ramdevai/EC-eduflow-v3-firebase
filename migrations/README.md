# Firestore migrations

Add versioned `.mjs` modules and export them from `index.mjs`.

Each migration must have this shape:

```js
export default {
  id: '2026-06-10-add-example-field',
  description: 'Backfill exampleField without replacing existing values.',
  async run({ db, dryRun, log }) {
    // Query only affected documents.
    // In dry-run mode, call log() but do not write.
    // In apply mode, use update() or set(..., { merge: true }).
  },
};
```

Migrations must be idempotent, additive by default, and safe to run more than once.

## Primary-contact recovery

The Google Contacts-dependent primary-contact recovery is intentionally not
registered in `_migrations`.

Local dry-run:

```bash
npm run db:recover-primary-contacts:local
```

First local or production apply must name one or two pilot lead IDs:

```bash
node scripts/recover-primary-contacts.mjs --apply --pilot lead-id-1,lead-id-2
node scripts/recover-primary-contacts.mjs --production --apply --pilot lead-id-1
```

After reviewing the pilot, a full apply requires `--confirm-full-apply`.
Production apply additionally requires
`CONFIRM_FIREBASE_PROJECT=eduflow-689c0`. Back up production and inspect a
production dry-run before applying.

## Normalized primary phone backfill

This migration scans `leads`, which holds active leads, customers, and lost
leads. The dry run reports aggregate counts for valid, invalid, and missing
phones, groups of two or more records, and proposed updates. Apply changes only
`phoneNormalized` for records with a valid primary phone. Each transaction
commits at most 200 lead updates with its checkpoint, so rerunning an interrupted
apply resumes from the last committed page.

Before applying in production, review the dry run, verify a completed native
Firestore export, and coordinate with the release that writes `phoneNormalized`
on lead creation and primary phone edits. Use the production migration commands
in the [deployment guide](../README.md#deployment). Production commands require
`NEXT_PUBLIC_APP_ENV=production` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID=eduflow-689c0`
alongside the existing credentials and apply confirmation.
