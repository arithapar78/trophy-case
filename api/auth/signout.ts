// POST /api/auth/signout
// Forgets this session on the server. The app forgets the token on the device.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { getBearerToken } from '../../server/auth.js'
import { sendJson } from '../../server/http.js'
import { getStore } from '../../server/storeInstance.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const token = getBearerToken(req)
  if (token) await getStore().deleteSession(token)
  sendJson(res, 200, { ok: true })
}
