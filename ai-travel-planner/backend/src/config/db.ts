import mongoose, { ConnectOptions } from 'mongoose';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3_000;

// ─── Typed sleep helper ────────────────────────────────────────────────────────
// Using an explicit Promise<void> generic prevents the TS2345 error that
// occurs when setTimeout's implicit `unknown` return leaks into strict mode.
const sleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── Connection ───────────────────────────────────────────────────────────────
export const connectDB = async (retries: number = MAX_RETRIES): Promise<void> => {
  const uri = process.env.MONGO_URI;

  // Guard clause: exit before the try block so TypeScript narrows
  // `uri` from `string | undefined` → `string` for the rest of the function.
  // Without this guard, the compiler raises TS2345 on mongoose.connect(uri, …).
  if (uri === undefined || uri === '') {
    console.error('[DB] MONGO_URI is not defined in environment variables.');
    process.exit(1);
  }

  // Explicitly type the options object so TS resolves serverSelectionTimeoutMS
  // via ConnectOptions (re-exported from the mongodb driver by Mongoose v7/v8).
  // Without this cast, strict mode raises TS2345 / TS2769 on some setups.
  const options: ConnectOptions = {
    serverSelectionTimeoutMS: 5_000,
  };

  try {
    await mongoose.connect(uri, options);
    console.log('[DB] MongoDB connected successfully.');

    // Explicitly typed parameter — required in strict mode (TS7006) because
    // the 'error' event on EventEmitter passes `unknown` in @types/node v18+.
    mongoose.connection.on('error', (err: Error) => {
      console.error('[DB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] MongoDB disconnected.');
    });
  } catch (error) {
    // In strict mode the catch binding is `unknown`, NOT `Error`.
    // Using `error instanceof Error` is the correct type-safe narrowing —
    // an `as Error` cast would suppress TS2571 rather than fix it.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[DB] Connection failed: ${message}`);

    if (retries > 0) {
      console.log(`[DB] Retrying in ${RETRY_DELAY_MS / 1_000}s… (${retries} attempt(s) left)`);
      await sleep(RETRY_DELAY_MS);
      // Return the recursive call so the async chain stays Promise<void>
      // without an accidental dangling promise (TS2345 / ESLint @typescript-eslint/no-floating-promises).
      return connectDB(retries - 1);
    }

    console.error('[DB] All connection attempts exhausted. Exiting.');
    process.exit(1);
  }
};