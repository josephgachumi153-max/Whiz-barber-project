import bcrypt from "bcryptjs";

/**
 * Hashes a plaintext password using bcryptjs.
 * Pure JavaScript implementation with zero native C++ dependencies,
 * guaranteed to run smoothly in Vercel Serverless Functions and local environments.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verifies a plaintext password against a stored password hash.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
