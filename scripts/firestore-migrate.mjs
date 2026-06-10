import { migrations } from '../migrations/index.mjs';
import {
  PRODUCTION_PROJECT_ID,
  createLocalFirestore,
  createProductionFirestore,
} from './firestore-admin.mjs';

const args = new Set(process.argv.slice(2));
const environment = args.has('--production') ? 'production' : 'local';
const apply = args.has('--apply');
const dryRun = !apply;

if (environment === 'production') {
  if (apply && process.env.CONFIRM_FIREBASE_PROJECT !== PRODUCTION_PROJECT_ID) {
    throw new Error(
      `Production apply requires CONFIRM_FIREBASE_PROJECT=${PRODUCTION_PROJECT_ID}.`
    );
  }
}

const db =
  environment === 'production'
    ? createProductionFirestore()
    : createLocalFirestore();

console.log(
  `Running ${environment} migrations in ${dryRun ? 'dry-run' : 'apply'} mode.`
);

for (const migration of migrations) {
  const record = db.collection('_migrations').doc(migration.id);
  const existing = await record.get();

  if (existing.exists) {
    console.log(`SKIP ${migration.id}: already applied.`);
    continue;
  }

  await migration.run({
    db,
    dryRun,
    log(message) {
      console.log(`  ${message}`);
    },
  });

  if (dryRun) {
    console.log(`DRY RUN ${migration.id}: ${migration.description}`);
    continue;
  }

  await record.create({
    description: migration.description,
    appliedAt: new Date().toISOString(),
  });
  console.log(`APPLIED ${migration.id}: ${migration.description}`);
}

if (migrations.length === 0) {
  console.log('No migrations are registered.');
}
