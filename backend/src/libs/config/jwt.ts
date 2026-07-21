if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

// Every JWT signed by the backend uses this — never fall back to a default
// here. A missing env var should stop the server from booting, not
// silently sign tokens with a value that's sitting in plain text in this
// file's git history.
export const JWT_SECRET = process.env.JWT_SECRET;
