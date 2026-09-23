// /api/auth/google, /api/auth/dev and /api/auth/signout, as ONE serverless
// function. See server/authRoutes.ts for why they share a file.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { authDispatch } from '../../server/authRoutes.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await authDispatch(req, res)
}
