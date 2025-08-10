import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { env } from 'std-env'
import { renderer } from './web/components/Layout.tsx'
import { sessionMiddleware } from './web/middleware/session.ts'
import { appRoutes } from './web/routes.tsx'

const app = new Hono()

// Register middleware
app.use(renderer)
app.use(sessionMiddleware)

// Register routes
app.route('/', appRoutes)

const PORT = Number(env.PORT) || 3000
console.log(`Server is running on http://localhost:${PORT}`)

serve({
  fetch: app.fetch,
  port: PORT,
})
