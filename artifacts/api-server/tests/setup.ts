// Provide minimal env so importing modules that read process.env at load
// time doesn't throw. Individual tests can override these as needed.
process.env.SESSION_SECRET ??= "test-session-secret-please-ignore";
process.env.MAIN_ACCESS_TOKEN ??= "test-access-token";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.NODE_ENV ??= "test";
