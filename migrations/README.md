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
