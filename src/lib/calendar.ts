const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Downloads an .ics reminder for the moment a capsule opens. */
export function downloadCalendarReminder(capsuleId: string, unlockAtSec: number, link?: string) {
  const start = unlockAtSec * 1000
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Time Capsule on Arc//EN',
    'BEGIN:VEVENT',
    `UID:capsule-${capsuleId}@time-capsule-arc`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(start + 15 * 60_000)}`,
    `SUMMARY:Time Capsule #${capsuleId} opens`,
    `DESCRIPTION:Your time capsule is ready to open.${link ? ` ${link}` : ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `time-capsule-${capsuleId}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
