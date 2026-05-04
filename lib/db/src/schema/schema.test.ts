import { describe, it, expect } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  usersTable,
  tokensTable,
  passkeysTable,
  userSettingsTable,
  webauthnChallengesTable,
} from "./index";

describe("db schema", () => {
  it("exposes the expected pg tables", () => {
    expect(getTableConfig(usersTable).name).toBe("users");
    expect(getTableConfig(tokensTable).name).toBe("tokens");
    expect(getTableConfig(passkeysTable).name).toBe("passkeys");
    expect(getTableConfig(userSettingsTable).name).toBe("user_settings");
    expect(getTableConfig(webauthnChallengesTable).name).toBe(
      "webauthn_challenges",
    );
  });

  it("user_settings has the columns the line-tags route relies on", () => {
    const cols = getTableConfig(userSettingsTable).columns.map((c) => c.name);
    expect(cols).toContain("user_id");
    expect(cols).toContain("line_tags");
    expect(cols).toContain("updated_at");
  });
});
