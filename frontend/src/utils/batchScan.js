/**
 * Parses whatever a batch scan (camera or manual entry, via ScanBatchModal)
 * hands back.
 *
 * QR codes written by BatchIdentityCard encode JSON:
 *   { type: 'batch', project_id, batch_id, project }
 * Codes coming out of the Project/Workflow/State setup (CreatePWS) may also
 * carry `workflow` / `state` alongside the same project_id, so this also
 * reads those when present. Barcodes -- and anything typed into the modal's
 * manual-entry fallback -- are just the raw batch_id string.
 *
 * This is the single place that knows the payload shape, so whichever
 * module ends up owning real Project data can generate its own QR codes any
 * way it likes: as long as the JSON has a `batch_id` key (optionally
 * `project_id` / `project` / `workflow` / `state`), or the code just encodes
 * the batch_id directly, every scanner in the app that uses this helper
 * will read it correctly.
 */
export function parseBatchScan(raw) {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && (parsed.batch_id || parsed.project_id)) {
      return {
        batchId: parsed.batch_id || null,
        projectId: parsed.project_id || null,
        projectName: parsed.project || parsed.project_name || null,
        workflowStage: parsed.workflow || parsed.workflow_stage || null,
        state: parsed.state || null,
      }
    }
  } catch {
    // not JSON -- fall through, treat the raw string as the batch_id itself
  }
  return { batchId: raw, projectId: null, projectName: null, workflowStage: null, state: null }
}
