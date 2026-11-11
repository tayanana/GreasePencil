import { getIdentity } from '../../cursor/identity.js';

/**
 * Rows are keyed by the verified viewer.
 * Preview and production hosts share one database, so the stage is part of the key
 * and a preview session cannot read or change the production garage.
 */
export function garageOwnerId(identity) {
  const stage = identity.stage === 'preview' ? 'preview' : 'production';
  return `${stage}:${identity.sub}`;
}

export function publicViewer(identity) {
  return {
    name: identity.name || (identity.kind === 'key' ? 'API key' : 'Signed-in viewer'),
    kind: identity.kind,
    simulated: identity.simulated === true,
    stage: identity.stage === 'preview' ? 'preview' : 'production',
  };
}

export async function requireViewer(req, res, next) {
  const identity = await getIdentity(req);
  res.set('cache-control', 'private, no-store');
  if (!identity.verified) {
    res.status(401).json({ error: 'Sign in is required to open this garage.' });
    return;
  }
  req.identity = identity;
  req.ownerId = garageOwnerId(identity);
  req.viewer = publicViewer(identity);
  next();
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** A custom header blocks a cross-site form from changing the garage with the viewer's session. */
export function requireAppHeader(req, res, next) {
  if (!MUTATING.has(req.method)) {
    next();
    return;
  }
  if (req.get('x-greasepencil-request') !== '1') {
    res.status(403).json({ error: 'This action has to come from the garage app.' });
    return;
  }
  next();
}
