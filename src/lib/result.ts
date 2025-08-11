export abstract class AppError extends Error {
	public readonly statusCode: number;
	public readonly code: string;

	constructor(message: string, statusCode: number, code: string) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
		// V8（Node.js、Chrome）でスタックトレースを正しくキャプチャするための設定
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
		// クラス名をエラー名として設定
		this.name = this.constructor.name;
	}
}

/**
 * 入力値のバリデーションエラー
 */
export class ValidationError extends AppError {
	constructor(message = "Invalid input") {
		super(message, 400, "INVALID_INPUT");
	}
}

/**
 * 認証・認可エラー
 */
export class UnauthorizedError extends AppError {
	constructor(message = "Unauthorized") {
		super(message, 401, "UNAUTHORIZED");
	}
}

/**
 * リソースが見つからないエラー
 */
export class NotFoundError extends AppError {
	constructor(message = "Resource not found") {
		super(message, 404, "NOT_FOUND");
	}
}

/**
 * ドメインロジックに起因するエラー
 */
export class DomainError extends AppError {
	// 422 Unprocessable Entity: サーバーはリクエストを理解できたが、意味的に正しくないため処理できない
	constructor(message = "A business rule was violated") {
		super(message, 422, "DOMAIN_ERROR");
	}
}

/**
 * 予期せぬサーバー内部エラー
 */
export class InternalServerError extends AppError {
	constructor(message = "An unexpected error occurred") {
		super(message, 500, "INTERNAL_SERVER_ERROR");
	}
}

// Result型: 成功(Success)と失敗(Failure)のどちらかの状態を持つ
type Success<T> = { success: true; data: T };
type Failure<E extends AppError> = { success: false; error: E };
export type Result<T, E extends AppError = AppError> = Success<T> | Failure<E>;

// Result型を生成するためのヘルパー関数
export const ok = <T>(data: T): Result<T, never> => ({
	success: true,
	data,
});

export const fail = <E extends AppError>(error: E): Result<never, E> => ({
	success: false,
	error,
});
