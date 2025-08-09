import { jsx } from 'hono/jsx'
import { getMonthDates } from '../../domain/calendar.js'

const STAMP_ICON = '✅'

export const CalendarGrid = ({ year, month, dates, stampsSet }) => {
  const stampsObj = Object.fromEntries([...stampsSet].map(d => [d, true]))
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
      const isStamped = stampsObj[isoDate]

      const cellProps = {
        class: 'calendar-cell',
      }

      if (!isStamped) {
        cellProps['hx-post'] = '/stamp'
        cellProps['hx-vals'] = JSON.stringify({ date: isoDate, year, month })
        cellProps['hx-target'] = '#calendar-grid'
        cellProps['hx-swap'] = 'outerHTML'
      } else {
        cellProps.class += ' stamped'
      }

      cells.push(
        <div {...cellProps}>
          <div class="date-number">{dayNumber}</div>
          {isStamped && <div class="stamp">{STAMP_ICON}</div>}
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

export const CalendarPage = ({ username, stampsSet }) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0‑indexed
  const dates = getMonthDates(year, month)
  const monthName = `${year}年${month + 1}月`

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
        .calendar-cell.stamped { cursor: default; }
        .date-number { font-size: 14px; font-weight: bold; }
        .stamp { position: absolute; bottom: 5px; right: 5px; font-size: 24px; }
      `}</style>
      <header>
        <h1>{monthName}</h1>
        <p>{username} さんのスタンプカレンダー</p>
      </header>
      <div id="calendar-container">
        <CalendarGrid year={year} month={month} dates={dates} stampsSet={stampsSet} />
      </div>
    </>
  )
}
