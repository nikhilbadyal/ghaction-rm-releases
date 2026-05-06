module.exports = {
  bail: true,
  clearMocks: true,
  coveragePathIgnorePatterns: [
    // Coverage should measure product behavior, not dependencies or Jest-only compatibility shims used to bridge resolver differences.
    "/node_modules/",
    "<rootDir>/__test__/mocks/"
  ],
  moduleFileExtensions: ["js", "ts"],
  moduleNameMapper: {
    // @actions/core v3 exposes an ESM import condition but this test suite still runs through ts-jest's CommonJS path, so Jest needs a local test shim instead of resolving the runtime package with require().
    "^@actions/core$": "<rootDir>/__test__/mocks/actions-core.ts",
    // @actions/github v9 is import-only through package exports, while the current Jest runtime resolves mocks through a CommonJS require path.
    "^@actions/github$": "<rootDir>/__test__/mocks/actions-github.ts"
  },
  setupFiles: ["dotenv/config"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest"
  }
}
