import {publishCanonicalDefinitionDraft} from './canonicalDefinitionPublisherR1';
import type {CanonicalDefinitionPublishPlan} from './canonicalDefinitionPublisherR1';
import type {Client} from 'pg';
test.each(['small','medium','large'])('retired %s area cannot be written by an old caller',async size=>{
 const query=jest.fn();
 const plan={definition:{catalog_id:`canonical-work:base:plaster_paint_interior_wall_plaster_apply_${size}_area`}} as CanonicalDefinitionPublishPlan;
 await expect(publishCanonicalDefinitionDraft({query} as unknown as Client,plan)).rejects.toThrow('CANONICAL_AREA_CATALOG_VARIANT_RETIRED');
 expect(query).not.toHaveBeenCalled();
});
