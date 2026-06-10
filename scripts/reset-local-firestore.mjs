import {
  LOCAL_EMULATOR_HOST,
  LOCAL_PROJECT_ID,
  assertLocalEnvironment,
} from './firestore-admin.mjs';

assertLocalEnvironment();

const url =
  `http://${LOCAL_EMULATOR_HOST}/emulator/v1/projects/${LOCAL_PROJECT_ID}` +
  '/databases/(default)/documents';
const response = await fetch(url, { method: 'DELETE' });

if (!response.ok) {
  throw new Error(`Failed to reset local Firestore: ${response.status} ${await response.text()}`);
}

console.log('Reset local Firestore emulator data.');
