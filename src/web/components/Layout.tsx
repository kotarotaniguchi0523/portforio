import { jsxRenderer } from "hono/jsx-renderer";

/**
 * Hono's JSX renderer, which acts as the base layout for all pages.
 * It sets up the basic HTML structure, head, and body tags.
 * @param {object} props The component props.
 * @param {import('hono/jsx').Element} props.children The child elements to render inside the body.
 * @param {string} props.title The title of the HTML page.
 */
export const renderer = jsxRenderer(({ children, title }) => {
        return (
                <html lang="ja">
                        <head>
                                <meta charset="UTF-8" />
                                <title>{title}</title>
                                <link href="/static/tailwind.css" rel="stylesheet" />
                                <script src="https://unpkg.com/htmx.org@1.9.10"></script>
                        </head>
                        <body class="m-0 font-sans">{children}</body>
                </html>
        );
});
