import { jsx } from 'hono/jsx'
import { getMonthDates } from '../../domain/calendar.js'

// Map lecture types to icons.
const LECTURE_ICONS = {
  default: '✅',
  math: '📐',
  history: '📜',
  science: '🧪',
}

/**
 * Renders the interactive grid of days for a given month.
 * @param {object} props The component props.
 * @param {number} props.year The full year (e.g., 2025).
 * @param {number} props.month The zero-based month index (0-11).
 * @param {Array<Date|null>} props.dates An array of Date objects and nulls representing the calendar grid.
 * @param {Array<{date: string, lectureType: string}>} props.stamps An array of stamp objects for the current user.
 */
export const CalendarGrid = ({ year, month, dates, stamps }) => {
  // Create a map from date string to lectureType for quick lookups.
  const stampsObj = Object.fromEntries((stamps || []).map(s => [s.date, s.lectureType]))
  const dayNames = ['日', '月', '火', '水', '木', '金', '土']
  const cells = dayNames.map(name => <div class="day-header">{name}</div>)

  dates.forEach((date) => {
    if (!date) {
      cells.push(<div class="calendar-cell disabled"></div>)
    } else {
      const y = date.getFullYear()
      const m = (date.getMonth() + 1).toString().padStart(2, '0')
      const d = date.getDate().toString().padStart(2, '0')
      const isoDate = `${y}-${m}-${d}`
      const dayNumber = date.getDate()
      const lectureType = stampsObj[isoDate] // This will be the lecture type string or undefined
      const isStamped = !!lectureType

      const cellProps = {
        class: 'calendar-cell',
      }

      // If the cell represents a valid date and is not already stamped, make it clickable.
      if (!isStamped) {
        cellProps.class += ' clickable'
        cellProps['hx-get'] = `/calendar/stamp-modal/${isoDate}`
        cellProps['hx-target'] = '#modal-placeholder'
        cellProps['hx-swap'] = 'innerHTML'
      } else {
        cellProps.class += ' stamped'
      }

      cells.push(
        <div {...cellProps}>
          <div class="date-number">{dayNumber}</div>
          {isStamped && (
            <div class="stamp">
              {LECTURE_ICONS[lectureType] || '❔'}
              {/* Optional: display lecture type text for debugging */}
              {/* <div class="lecture-type-text">{lectureType}</div> */}
            </div>
          )}
        </div>
      )
    }
  })

  return (
    <div id="calendar-grid" class="calendar-grid">
      {...cells}
    </div>
  )
}

/**
 * Renders the main calendar page, including the header and the calendar grid.
 * @param {object} props The component props.
 * @param {string} props.username The display name of the logged-in user.
 * @param {Array<{date: string, lectureType: string}>} props.stamps An array of stamp objects for the current user.
 */
export const CalendarPage = ({ username, stamps }) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  const dates = getMonthDates(year, month)
  const monthName = `${year}年${month + 1}月`

  return (
    <>
      <style>{`
        body { font-family: sans-serif; background: #f7f9fb; margin: 0; padding: 0; }
        header { background: #4a90e2; color: white; padding: 1rem 2rem; text-align: center; position: relative; }
        .logout-btn { position: absolute; top: 1rem; right: 1rem; background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }
        .logout-btn:hover { background: #c0392b; }
        #calendar-container { max-width: 800px; margin: 30px auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
        .day-header { font-weight: bold; text-align: center; padding: 8px 0; background: #eef3fa; border-radius: 4px; }
        .calendar-cell { min-height: 80px; position: relative; padding: 8px; border-radius: 6px; }
        .calendar-cell.disabled { background: #f5f5f5; cursor: default; }
        .calendar-cell.stamped { cursor: default; }
        .calendar-cell.clickable { cursor: pointer; }
        .calendar-cell.clickable:hover { background: #eef3fa; }
        .date-number { font-size: 14px; font-weight: bold; }
        .stamp { position: absolute; bottom: 5px; right: 5px; font-size: 24px; }
        .lecture-type-text { font-size: 10px; text-align: right; }

        /* Modal styles */
        #modal-placeholder { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 100; }
        .modal { border: none; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); padding: 0; max-width: 400px; }
        .modal::backdrop { background: rgba(0, 0, 0, 0.5); }
        .modal-content { padding: 20px; text-align: center; }
        .modal-actions { margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; }
        .lecture-select { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; margin-bottom: 1rem; }
        .btn-confirm { background: #4a90e2; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }
        .btn-cancel { background: #ccc; color: black; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }
      `}</style>
      <header>
        <form action="/logout" method="get">
          <button type="submit" class="logout-btn">ログアウト</button>
        </form>
        <h1>{monthName}</h1>
        <p>{username} さんのスタンプカレンダー</p>
      </header>
      <div id="calendar-container">
        <CalendarGrid year={year} month={month} dates={dates} stamps={stamps} />
      </div>
      <div id="modal-placeholder"></div>
      <script>
        {`setTimeout(() => { window.location.href = '/logout'; }, 20000);`}
      </script>
    </>
  )
}
