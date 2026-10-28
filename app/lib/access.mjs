import {AppError} from './domain.mjs';
// One-workshop MVP. The first, immutable case anchors the workshop operator.
// Bootstrap happens while the Site is owner-private; participants need an existing case.
export async function requireWorkshopOperator(store,user){const first=await store.one('SELECT owner FROM recovery_cases ORDER BY created_at,id LIMIT 1');if(first&&first.owner!==user)throw new AppError('Only the workshop owner can use these controls. Open participant reviews for your invited role.',403,'WORKSHOP_OWNER_REQUIRED');return user;}
