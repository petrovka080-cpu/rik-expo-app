import { buildStagingVersionPayload } from "../src/lib/platform/stagingVersionPayload";

export function GET() {
  return Response.json(buildStagingVersionPayload());
}
