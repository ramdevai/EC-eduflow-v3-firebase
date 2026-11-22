import { z } from 'zod';

export const CollaborationId = z.string().uuid();
export const CollaborationCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{0,23}$/);

export const CollaborationDetails = z.object({
  title: z.string().trim().min(2).max(100),
  intro: z.string().trim().max(360),
  collaborator: z.string().trim().min(2).max(100),
  offer: z.string().trim().max(360),
}).strict();

export const NewCollaboration = CollaborationDetails.extend({ code: CollaborationCode });

export const CollaborationChange = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), revision: z.number().int().positive(), details: CollaborationDetails }).strict(),
  z.object({ action: z.enum(['launch', 'close']), revision: z.number().int().positive() }).strict(),
]);

export type Collaboration = z.infer<typeof NewCollaboration> & {
  id: string;
  ownerUid: string;
  status: 'Draft' | 'Active' | 'Closed';
  revision: number;
  updatedAt: string;
};
