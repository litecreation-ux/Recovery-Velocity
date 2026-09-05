export function isDemoAuthorityEnabled(): boolean {
  return process.env.NODE_ENV === "test"
    && process.env.ALLOW_RVP_DEMO_AUTH === "true";
}