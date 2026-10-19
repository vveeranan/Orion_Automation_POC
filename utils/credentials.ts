import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Loads ORION_USERNAME / ORION_PASSWORD from the gitignored .env file (if present)
 * and returns them, with the password Base64-decoded. Values already set in the
 * process environment win.
 * Never log the returned password.
 */
export function getCredentials(): { username: string; password: string } {
  const envFile = resolve(__dirname, '..', '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const username = process.env.ORION_USERNAME;
  const password = process.env.ORION_PASSWORD;
  if (!username || !password) {
    throw new Error('ORION_USERNAME / ORION_PASSWORD are not set. See .env.example.');
  }
  // ORION_PASSWORD is stored Base64-encoded; decode it for use at login.
  return { username, password: Buffer.from(password, 'base64').toString('utf8') };
}

/**
 * Credentials of a user who can open Administration > Groups but has NO KPI access (RT-25957 access control tests), from
 * ORION_NOKPI_USERNAME / ORION_NOKPI_PASSWORD (Base64-encoded) in .env. Returns undefined when they are not set, so the
 * tests that need this user can skip instead of failing. Orion users and permissions cannot be created by the setups
 * (the Worker Portal DLL has no user/role methods), so this user is provisioned once by hand.
 * Never log the returned password.
 */
export function getNoKpiAccessCredentials(): { username: string; password: string } | undefined {
  const envFile = resolve(__dirname, '..', '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const username = process.env.ORION_NOKPI_USERNAME;
  const password = process.env.ORION_NOKPI_PASSWORD;
  if (!username || !password) {
    return undefined;
  }
  return { username, password: Buffer.from(password, 'base64').toString('utf8') };
}
