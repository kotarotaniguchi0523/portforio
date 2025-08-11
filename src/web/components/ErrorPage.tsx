/**
 * A generic error page component.
 * @param {object} props The component props.
 * @param {string} [props.errorTitle='エラーが発生しました'] The title of the error.
 * @param {string} [props.errorMessage='問題が発生しました。しばらくしてからもう一度お試しください。'] The detailed error message.
 */
export const ErrorPage = ({
	// biome-ignore lint/nursery/noSecrets: Japanese error messages are not secrets.
	errorTitle = "エラーが発生しました",
	// biome-ignore lint/nursery/noSecrets: Japanese error messages are not secrets.
	errorMessage = "問題が発生しました。しばらくしてからもう一度お試しください。",
}) => {
        return (
                <div class="flex min-h-screen items-center justify-center bg-[#f0f2f5]">
                        <div class="text-center bg-white p-10 rounded-xl shadow-lg border-l-4 border-[#e74c3c]">
                                <h1 class="text-[#e74c3c]">{errorTitle}</h1>
                                <p class="text-lg text-[#666]">{errorMessage}</p>
                                <br />
                                <a href="/" class="text-[#3498db] hover:underline">
                                        ログインページに戻る
                                </a>
                        </div>
                </div>
        );
};
