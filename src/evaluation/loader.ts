import type { AuthoringEvaluationCase, LoadedEvaluationCase } from "./case-schema.js";
import { loadEvaluationDataset, toRunnableCase } from "./case-schema.js";

export function loadEvaluationCases(): LoadedEvaluationCase[] {
  const dataset = loadEvaluationDataset();
  const ids = new Set<string>();
  return dataset.cases.map((caseRecord: AuthoringEvaluationCase, index: number) => {
    if (ids.has(caseRecord.case_id)) {
      throw new Error(`Duplicate case_id detected: ${caseRecord.case_id}`);
    }
    ids.add(caseRecord.case_id);
    const expectedId = `LB-${String(index + 1).padStart(3, "0")}`;
    if (caseRecord.case_id !== expectedId) {
      throw new Error(`Expected ${expectedId} at position ${index + 1}`);
    }
    return {
      case_id: caseRecord.case_id,
      authoring: caseRecord,
      runnable: toRunnableCase(caseRecord),
    };
  });
}
