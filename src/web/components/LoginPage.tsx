/**
 * Renders the login page for the application.
 * It provides a single button to initiate the LINE login flow.
 */
export const LoginPage = () => {
        return (
                <div class="flex min-h-screen items-center justify-center bg-[#f0f2f5]">
                        <div class="text-center bg-white p-10 rounded-xl shadow-lg">
                                <h1 class="text-[#333]">スタンプカレンダー</h1>
                                <p>LINEアカウントでログインしてください。</p>
                                <a
                                        href="/login/line"
                                        class="mt-4 inline-block rounded-md bg-line px-6 py-3 font-bold text-white transition-colors duration-300 hover:bg-line-dark"
                                >
                                        LINEでログイン
                                </a>
                        </div>
                </div>
        );
};
