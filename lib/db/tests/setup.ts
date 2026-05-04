// Provide a dummy DATABASE_URL so importing @workspace/db's index doesn't
// throw at module load. Tests in this package never open a real connection;
// they only inspect schema metadata.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
