import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(
  ({ children, title }) => {
    return (
      <html lang="ja">
        <head>
          <meta charset="UTF-8" />
          <title>{title}</title>
          <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        </head>
        <body>
          {children}
        </body>
      </html>
    )
  }
)
