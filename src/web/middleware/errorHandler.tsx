import type { ErrorHandler } from "hono";
import { ZodError } from "zod";
import { AppError, InternalServerError, ValidationError } from "../../lib/result";
import { ErrorPage } from "../components/ErrorPage";
import type { Env } from "../../types";

/**
 * アプリケーション全体のエラーを処理するHonoミドルウェア
 */
export const errorHandler: ErrorHandler<Env> = (err, c) => {
	// 1. エラーを正規化する
	let appError: AppError;
	if (err instanceof AppError) {
		appError = err;
	} else if ("errors" in err && Array.isArray(err.errors)) {
		// Duck-typing for ZodError. This is more robust in test environments
		// where `instanceof` can fail due to module resolution issues.
		const messages = err.errors.map(
			(e: { path: (string | number)[]; message: string }) =>
				`${e.path.join(".")}: ${e.message}`,
		);
		appError = new ValidationError(messages.join(", "));
	} else {
		// 予期せぬエラー
		console.error("Unhandled Error:", err);
		appError = new InternalServerError("An unexpected error occurred.");
	}

	// 2. レスポンス形式を決定する (HTML or JSON)
	const acceptHeader = c.req.header("Accept") || "";
	const isHtmlRequest = acceptHeader.includes("text/html");

	if (isHtmlRequest) {
		// HTMLリクエストの場合はエラーページをレンダリング
		// `c.render` は `Layout.tsx` の `renderer` ミドルウェアによって提供される
		return c.render(
			<ErrorPage
				errorTitle={`${appError.statusCode} ${appError.name}`}
				errorMessage={appError.message}
			/>,
			{
				title: "エラー",
			},
		);
	}

	// Return JSON response for JSON requests
	c.status(appError.statusCode);
	return c.json({
		error: {
			code: appError.code,
			message: appError.message,
		},
	});
};
