# 解説: 新しいエラーハンドリングとレスポンス形式の導入

このドキュメントでは、プロジェクトに新たに導入されたエラーハンドリングとレスポンス形式のアーキテクチャについて解説します。この変更は、コードの堅牢性、一貫性、保守性を向上させることを目的としています。

## 1. 概要

新しいアーキテクチャは、以下の3つの主要な要素で構成されています。

1.  **`Result` 型**: ドメイン（ビジネスロジック）層の関数が、例外をスローする代わりに、成功 (`Success`) または失敗 (`Failure`) を示す `Result` オブジェクトを返します。これにより、エラーが関数のシグネチャの一部として明示的に表現され、型安全性が向上します。
2.  **カスタムエラークラス**: `AppError` を基底クラスとする、アプリケーション固有のエラー（例: `ValidationError`, `NotFoundError`）を定義しました。これにより、エラーの種類を構造的に表現できます。
3.  **グローバルエラーハンドラ**: Honoの `app.onError` 機能を利用して、アプリケーション全体のエラーを一元的に処理します。このハンドラが、ルートでスローされたエラーをキャッチし、適切なHTTPステータスコードと統一された形式のレスポンス（JSONまたはHTML）を返却します。

このアプローチにより、各ルートハンドラから `try-catch` ブロックを排除し、ロジックをクリーンに保つことができます。

## 2. エラー処理のフロー

リクエスト処理中にエラーが発生した場合、以下のようなフローで処理されます。

1.  **入力バリデーション (zValidator)**:
    *   `@hono/zod-openapi` の `zValidator` がリクエスト（フォーム、JSONボディなど）を検証します。
    *   検証に失敗すると、`zValidator` は `ZodError` をスローします。

2.  **ドメインロジックの実行**:
    *   ルートハンドラは、検証済みのデータをドメイン層の関数（例: `addStampForSession`）に渡します。
    *   ビジネスルール違反（例: セッションが見つからない）が発生した場合、関数は `fail(new NotFoundError(...))` のような `Failure` 型の `Result` オブジェクトを返します。

3.  **ルートハンドラでの結果処理**:
    *   ルートハンドラは、ドメイン層から返された `Result` オブジェクトをチェックします。
    *   もし結果が `Failure` であれば、ハンドラはその `result.error` を **スローします (`throw result.error`)**。

4.  **グローバルエラーハンドラでのキャッチ**:
    *   スローされたエラー（`ZodError` またはカスタムの `AppError`）は、`src/main.ts` で登録されたグローバルエラーハンドラ (`errorHandler`) にキャッチされます。
    *   ハンドラはエラーの種類を判別し、`Accept` ヘッダーに応じて適切なレスポンスを生成します。
        *   **JSONレスポンス** (API/htmxリクエスト): `{ "error": { "code": "...", "message": "..." } }`
        *   **HTMLレスポンス** (通常のブラウザ遷移): 専用のエラーページ

## 3. 開発者向けガイド: このパターンの使い方

新しいルートを追加したり、既存のルートをリファクタリングしたりする際は、以下の手順に従ってください。

1.  **ドメイン層の関数を修正・作成する**:
    *   例外を `throw` する代わりに、`Result<SuccessType, ErrorType>` を返すようにします。
    *   成功した場合は `ok(data)` を、失敗した場合は `fail(new CustomError(...))` を返します。

    ```typescript
    // src/domain/someLogic.ts
    import { ok, fail, Result, DomainError } from '../lib/result';

    export function doSomething(input: string): Result<{ value: string }, DomainError> {
      if (input === 'invalid') {
        return fail(new DomainError('The input is invalid.'));
      }
      return ok({ value: `Processed: ${input}` });
    }
    ```

2.  **Honoルートを定義する**:
    *   必要に応じて `zValidator` をミドルウェアとして追加し、入力値を検証します。
    *   ドメイン関数を呼び出し、返ってきた `Result` をハンドリングします。
    *   失敗（`!result.success`）した場合は、エラーを `throw` してください。グローバルハンドラが残りを処理します。

    ```typescript
    // src/web/routes.tsx
    import { zValidator } from '@hono/zod-openapi';
    import { doSomething } from '../domain/someLogic';

    app.post(
      '/do-something',
      zValidator('form', z.object({ input: z.string() })),
      (c) => {
        const { input } = c.req.valid('form');
        const result = doSomething(input);

        if (!result.success) {
          throw result.error; // エラーをスロー！
        }

        return c.json({ data: result.data });
      }
    );
    ```

## 4. メリット (Pros)

*   **型安全性**: エラーが関数の戻り値の型に含まれるため、どのようなエラーが発生しうるかが静的に分かり、ハンドリング漏れを防ぎやすくなります。
*   **クリーンなルート**: `try-catch` が不要になり、ルートハンドラは成功時のハッピーパスに集中できます。
*   **一貫性のあるレスポンス**: エラーレスポンスの形式とHTTPステータスコードが、グローバルハンドラによって一元管理され、アプリケーション全体で統一されます。
*   **関心の分離**: ドメインロジックはビジネスルールに集中し、HTTPに関する責務（ステータスコード、レスポンス形式）はWeb層（ハンドラとミドルウェア）が担当します。

## 5. デメリット (Cons)

*   **学習コスト**: `Result` 型（またはEitherモナド）の考え方に慣れていない開発者にとっては、少し学習が必要です。
*   **記述量の増加**: 単純な場合に `throw new Error()` と書くのに比べ、`Result` 型を返すためのコードは少し長くなることがあります。
