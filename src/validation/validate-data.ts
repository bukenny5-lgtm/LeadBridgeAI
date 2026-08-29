import { loadSyntheticFixtures, validateSyntheticFixtures } from "../data/fixtures.js";

function main(): void {
  const fixtures = loadSyntheticFixtures();
  const issues = validateSyntheticFixtures(fixtures);
  if (issues.length) {
    for (const issue of issues) {
      process.stderr.write(`[${issue.scope}] ${issue.message}\n`);
    }
    process.exitCode = 1;
    return;
  }
  process.stdout.write("Synthetic fixture validation passed.\n");
}

main();
