// Staged entry point only. No alternate writer: after ROOT admits the exact
// guard and current execution pins, invoke the existing Master publisher.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareStandardAsphaltCompactionMasterDraftR567} from './prepareStandardAsphaltCompactionMasterDraftR567';
import {runMasterSingleDefinitionSuccessorR1} from './prepareMasterSingleDefinitionSuccessorR1';
import type {MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';

type Json=Record<string,any>;
async function main(){
  const file=process.env.R567_ROOT_PUBLICATION_INPUT_PATH,expected=process.env.R567_ROOT_PUBLICATION_INPUT_SHA256;
  if(!file||!expected)throw Error('R567_ROOT_PUBLICATION_INPUT_PIN_REQUIRED');
  const bytes=readFileSync(file);
  if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('R567_ROOT_PUBLICATION_INPUT_PIN_DRIFT');
  const root=JSON.parse(bytes.toString('utf8')) as Json,draft=prepareStandardAsphaltCompactionMasterDraftR567();
  if(root.status!=='ROOT_APPROVED_R567_FRESH_RETAINED_PUBLICATION_INPUTS'
    ||root.standardParentCaptureSha256!==draft.standardParentCaptureSha256
    ||root.physicalRecipeCaptureSha256!==draft.physicalRecipeCaptureSha256
    ||typeof root.parentReleaseId!=='string'||typeof root.parentSearchReleaseId!=='string'
    ||!root.retainedGuardOptIn||typeof root.retainedGuardOptIn!=='object')throw Error('R567_FRESH_ROOT_ADMISSION_REQUIRED');
  for(const key of ['capturedParent','capturedParentSha256','newParameterSources','legacyCapturedFixtureSources'])
    if(Object.hasOwn(root.retainedGuardOptIn,key))throw Error('R567_CAPTURE_OVERRIDE_FORBIDDEN:'+key);
  const fields=draft.knownConfigFields;
  await runMasterSingleDefinitionSuccessorR1({...fields,parentReleaseId:root.parentReleaseId,parentSearchReleaseId:root.parentSearchReleaseId,
    binding:{...fields.binding,retainParentBindings:{...fields.binding.retainParentBindings!,...root.retainedGuardOptIn} as MasterRetainParentBindingsR1},
    sourcePaths:[...fields.sourcePaths,file]});
}
void main().catch((error:unknown)=>{process.stderr.write(`${error instanceof Error?error.stack??error.message:String(error)}\n`);process.exitCode=1;});
