import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { renderer } from './web/components/Layout.jsx'
import { sessionMiddleware } from './web/middleware/session.js'
import { appRoutes } from './web/routes.js'

const app = new Hono()

// Register middleware
app.use(renderer)
app.use(sessionMiddleware)

// Register routes
app.route('/', appRoutes)

const PORT = process.env.PORT || 3000
console.log(`Server is running on http://localhost:${PORT}`)

serve({
  fetch: app.fetch,
  port: PORT,
})
