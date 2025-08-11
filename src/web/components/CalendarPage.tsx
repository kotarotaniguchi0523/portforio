import type { Stamp } from "../../domain/types.ts";

/**
 * Renders the interactive grid of days for a given month.
 * @param {object} props The component props.
 * @param {Array<Date|null>} props.dates An array of Date objects and nulls representing the calendar grid.
 * @param {Stamp[]} props.stamps An array of stamp objects for the current user.
 */
export const CalendarGrid = ({
        dates,
        stamps,
}: {
        dates: (Date | null)[];
        stamps: Stamp[];
}) => {
        // Create a map from date string to the entire stamp object for quick lookups.
        const stampsObj = Object.fromEntries(stamps.map((s) => [s.date, s]));
        const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
        const cells = dayNames.map((name) => (
                <div class="rounded bg-calendar-highlight py-2 text-center font-bold">{name}</div>
        ));

        dates.forEach((date) => {
                if (!date) {
                        cells.push(
                                <div class="relative min-h-[80px] cursor-default rounded-md bg-[#f5f5f5] p-2"></div>,
                        );
                } else {
                        const y = date.getFullYear();
                        const m = (date.getMonth() + 1).toString().padStart(2, "0");
                        const d = date.getDate().toString().padStart(2, "0");
                        const isoDate = `${y}-${m}-${d}`;
                        const dayNumber = date.getDate();
                        const stamp = stampsObj[isoDate]; // This will be the Stamp object or undefined
                        const isStamped = Boolean(stamp);

                        const cellProps: {
                                class: string;
                                "hx-get"?: string;
                                "hx-target"?: string;
                                "hx-swap"?: string;
                        } = {
                                class: "relative min-h-[80px] rounded-md p-2",
                        };

                        // If the cell represents a valid date and is not already stamped, make it clickable.
                        if (!isStamped) {
                                cellProps.class += " cursor-pointer hover:bg-calendar-blue";
                                cellProps["hx-get"] = `/calendar/stamp-modal/${isoDate}`;
                                cellProps["hx-target"] = "#modal-placeholder";
                                cellProps["hx-swap"] = "innerHTML";
                        } else {
                                cellProps.class += " cursor-default";
                        }

                        cells.push(
                                <div {...cellProps}>
                                        <div class="text-sm font-bold">{dayNumber}</div>
                                        {isStamped && stamp.iconUrl && (
                                                <div class="absolute bottom-1 right-1">
                                                        <img
                                                                src={stamp.iconUrl}
                                                                alt={stamp.lectureName ?? "Stamp"}
                                                                class="h-6 w-6 object-contain"
                                                        />
                                                </div>
                                        )}
                                </div>,
                        );
                }
        });

        return (
                <div id="calendar-grid" class="grid grid-cols-7 gap-1">
                        {...cells}
                </div>
        );
};

/**
 * Renders the main calendar page, including the header and the calendar grid.
 * @param {object} props The component props.
 * @param {string} props.username The display name of the logged-in user.
 * @param {Stamp[]} props.stamps An array of stamp objects for the current user.
 * @param {(Date|null)[]} props.dates Calendar grid for the current month.
 * @param {number} props.year The calendar year being displayed.
 * @param {number} props.month The zero-indexed month being displayed.
 */
export const CalendarPage = ({
        username,
        stamps,
        dates,
        year,
        month,
}: {
        username: string;
        stamps: Stamp[];
        dates: (Date | null)[];
        year: number;
        month: number;
}) => {
        const monthName = `${year}年${month + 1}月`;

        return (
                <div class="min-h-screen bg-[#f7f9fb]">
                        <header class="relative bg-[#4a90e2] px-8 py-4 text-center text-white">
                                <form action="/logout" method="get">
                                        <button
                                                type="submit"
                                                class="absolute right-4 top-4 rounded-md bg-[#e74c3c] px-3 py-2 text-white hover:bg-[#c0392b]"
                                        >
                                                ログアウト
                                        </button>
                                </form>
                                <h1>{monthName}</h1>
                                <p>{username} さんのスタンプカレンダー</p>
                        </header>
                        <div
                                id="calendar-container"
                                class="mx-auto mt-8 max-w-4xl rounded-xl bg-white p-5 shadow-md"
                        >
                                <CalendarGrid dates={dates} stamps={stamps} />
                        </div>
                        <div id="modal-placeholder" class="fixed inset-0 z-[100]"></div>
                        <script>
                                {`setTimeout(() => { window.location.href = '/logout'; }, 20000);`}
                        </script>
                </div>
        );
};
