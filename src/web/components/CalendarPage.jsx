import { jsx } from 'hono/jsx'
import { getMonthDates } from '../../domain/calendar.js'

export const CalendarPage = ({ username, stampsSet }) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0‑indexed
  const dates = getMonthDates(year, month)
  const stampsObj = {}
  stampsSet.forEach((d) => {
    stampsObj[d] = true
  })
  const monthName = `${year}年${month + 1}月`

  const initialData = {
    year,
    month,
    dates: dates.map((d) => (d ? d.toISOString().split('T')[0] : null)),
    stamps: stampsObj,
  }

  // Client-side script as a string
  const clientScript = `
    import { render, useState, jsx } from 'https://esm.sh/hono/jsx/dom'
    const container = document.getElementById('calendar')
    const data = JSON.parse(document.getElementById('initial-data').textContent)
    const STAMP_ICON = '✅'

    function CalendarApp() {
      const [stamps, setStamps] = useState(data.stamps)

      function handleClick(date) {
        if (!date || stamps[date]) return
        const updated = { ...stamps, [date]: true }
        setStamps(updated)
        htmx.ajax('POST', '/stamp', { values: { date } })
      }

      const dayNames = ['日', '月', '火', '水', '木', '金', '土']
      const cells = dayNames.map(name => jsx('div', { class: 'day-header' }, name))

      data.dates.forEach((iso) => {
        if (!iso) {
          cells.push(jsx('div', { class: 'calendar-cell disabled' }, ''))
        } else {
          const dayNumber = new Date(iso).getDate()
          const stamped = stamps[iso]
          const dayNumberEl = jsx('div', { class: 'date-number' }, dayNumber.toString())
          const stampEl = stamped ? jsx('div', { class: 'stamp' }, STAMP_ICON) : null;
          cells.push(
            jsx('div', { class: 'calendar-cell', onClick: () => handleClick(iso) }, dayNumberEl, stampEl)
          );
        }
      })
      return jsx('div', { class: 'calendar-grid' }, ...cells)
    }
    render(jsx(CalendarApp, {}), container)
  `

  return (
    <>
      <style>{`
        body { font-family: sans-serif; background: #f7f9fb; margin: 0; padding: 0; }
        header { background: #4a90e2; color: white; padding: 1rem 2rem; text-align: center; }
        #calendar-container { max-width: 800px; margin: 30px auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
        .day-header { font-weight: bold; text-align: center; padding: 8px 0; background: #eef3fa; border-radius: 4px; }
        .calendar-cell { min-height: 80px; position: relative; padding: 8px; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
        .calendar-cell:hover { background: #f0f8ff; }
        .calendar-cell.disabled { background: #f5f5f5; cursor: default; }
        .date-number { font-size: 14px; font-weight: bold; }
        .stamp { position: absolute; bottom: 5px; right: 5px; font-size: 24px; }
      `}</style>
      <header>
        <h1>{monthName}</h1>
        <p>{username} さんのスタンプカレンダー</p>
      </header>
      <div id="calendar-container">
        <div id="calendar"></div>
      </div>
      <script id="initial-data" type="application/json">{JSON.stringify(initialData)}</script>
      <script type="module">{clientScript}</script>
    </>
  )
}
