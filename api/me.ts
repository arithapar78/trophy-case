// GET /api/me     who is signed in, their plan, and their AI usage
// DELETE /api/me  delete the account (user, sessions, usage). The
//                 achievements on the device are untouched: they were never here.

import type { IncomingMessage, ServerResponse } from 'node:http'
import { authenticate } from '../server/auth.js'
import { mockBillingAllowed } from '../server/billing.js'
import { sendJson } from '../server/http.js'
import { getStore } from '../server/storeInstance.js'
import { getUsageFor } from '../server/usage.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const store = getStore()
  const user = await authenticate(store, req)
  if (!user) {
    sendJson(res, 401, { ok: false, code: 'signin', message: 'Not signed in.' })
    return
  }
  if (req.method === 'DELETE') {
    await store.deleteUser(user.id)
    sendJson(res, 200, { ok: true })
    return
  }
  sendJson(res, 200, {
    ok: true,
    user: {
      email: user.email,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus ?? null,
      // Whether "Manage subscription" can do anything yet.
      canManage: Boolean(user.stripeCustomerId) || mockBillingAllowed(),
    },
    usage: await getUsageFor(store, user),
  })
}
