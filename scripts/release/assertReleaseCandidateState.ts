import {
  RELEASE_CANDIDATE_STATES,
  assertReleaseCandidateState,
  transitionReleaseCandidate,
  type ReleaseCandidateState,
} from "./releaseCandidateState";

function main(): void {
  const command = process.argv[2];
  if (command?.startsWith("--advance=")) {
    const nextState = command.slice("--advance=".length) as ReleaseCandidateState;
    if (!RELEASE_CANDIDATE_STATES.includes(nextState)) {
      throw new Error(`Usage: tsx scripts/release/assertReleaseCandidateState.ts --advance=<${RELEASE_CANDIDATE_STATES.join("|")}>`);
    }
    const candidate = transitionReleaseCandidate(nextState);
    console.log(JSON.stringify({
      candidate_id: candidate.candidate_id,
      state: candidate.state,
      fake_green_claimed: false,
    }, null, 2));
    return;
  }

  const expected = command as ReleaseCandidateState | undefined;
  if (!expected || !RELEASE_CANDIDATE_STATES.includes(expected)) {
    throw new Error(`Usage: tsx scripts/release/assertReleaseCandidateState.ts <${RELEASE_CANDIDATE_STATES.join("|")}> or --advance=<state>`);
  }
  const candidate = assertReleaseCandidateState(expected);
  console.log(JSON.stringify({
    candidate_id: candidate.candidate_id,
    state: candidate.state,
    fake_green_claimed: false,
  }, null, 2));
}

main();
