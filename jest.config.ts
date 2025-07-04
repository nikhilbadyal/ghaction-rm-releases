module.exports = {
  bail: true,
  clearMocks: true,
  moduleFileExtensions: ["js", "ts"],
  setupFiles: ["dotenv/config"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest"
  }
}
