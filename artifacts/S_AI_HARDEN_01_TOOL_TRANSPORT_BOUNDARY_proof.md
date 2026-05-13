# S_AI_HARDEN_01_AI_TOOL_TRANSPORT_BOUNDARY

Status: `GREEN_AI_TOOL_TRANSPORT_BOUNDARY_READY`

Proof:

- AI tool runtime modules import their named `.transport.ts` boundary.
- Runtime routes have bounded DTO contracts for task stream, command center, procurement copilot, external intel, screen runtime, approval inbox, and approved executor.
- Transport modules do not import model providers or Supabase.
- Transport DTOs expose evidence refs or an exact blocked reason, never raw rows or provider payloads.
