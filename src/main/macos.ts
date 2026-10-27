import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { escapeAppleScript } from './security'

const execFileAsync = promisify(execFile)

async function runAppleScript(script: string): Promise<string> {
  const { stdout } = await execFileAsync('/usr/bin/osascript', ['-e', script], {
    timeout: 25_000,
    maxBuffer: 2 * 1024 * 1024
  })
  return stdout.trim()
}

export interface CalendarEvent {
  title: string
  start: string
  end: string
  calendar: string
}

export async function listCalendarEvents(daysAhead = 7): Promise<CalendarEvent[]> {
  const script = `
set output to ""
tell application "Calendar"
  repeat with cal in calendars
    set calName to name of cal
    repeat with evt in (every event of cal whose start date is greater than (current date) and start date is less than ((current date) + ${Math.max(1, Math.min(31, daysAhead))} * days))
      try
        set output to output & (summary of evt as text) & tab & (start date of evt as text) & tab & (end date of evt as text) & tab & calName & linefeed
      end try
    end repeat
  end repeat
end tell
return output`
  const output = await runAppleScript(script)
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [title = '', start = '', end = '', calendar = ''] = line.split('\t')
      return { title, start, end, calendar }
    })
}

export async function createCalendarEvent(input: {
  title: string
  startIso: string
  durationMinutes: number
  notes?: string
  calendarName?: string
}): Promise<string> {
  const date = new Date(input.startIso)
  if (Number.isNaN(date.getTime())) throw new Error('开始时间无效')
  const end = new Date(date.getTime() + Math.max(5, input.durationMinutes) * 60_000)
  const endScriptDate = (value: Date) =>
    `date "${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
      value.getDate()
    ).padStart(2, '0')} ${String(value.getHours()).padStart(2, '0')}:${String(
      value.getMinutes()
    ).padStart(2, '0')}:00"`
  const script = `
set targetStart to ${endScriptDate(date)}
set targetEnd to ${endScriptDate(end)}
tell application "Calendar"
  set targetCalendar to first calendar
  ${
    input.calendarName
      ? `try
           set targetCalendar to first calendar whose name is "${escapeAppleScript(input.calendarName)}"
         end try`
      : ''
  }
  tell targetCalendar
    make new event with properties {summary:"${escapeAppleScript(input.title)}", start date:targetStart, end date:targetEnd, description:"${escapeAppleScript(input.notes ?? '')}"}
  end tell
end tell
return "created"`
  await runAppleScript(script)
  return `已在日历中创建「${input.title}」`
}

export async function listReminders(limit = 20): Promise<Array<{ name: string; due: string; list: string }>> {
  const script = `
set output to ""
tell application "Reminders"
  repeat with theList in lists
    set listName to name of theList
    repeat with rem in (reminders of theList whose completed is false)
      try
        set dueText to ""
        if due date of rem is not missing value then set dueText to due date of rem as text
        set output to output & (name of rem as text) & tab & dueText & tab & listName & linefeed
      end try
    end repeat
  end repeat
end tell
return output`
  const output = await runAppleScript(script)
  return output
    .split('\n')
    .filter(Boolean)
    .slice(0, limit)
    .map((line) => {
      const [name = '', due = '', list = ''] = line.split('\t')
      return { name, due, list }
    })
}

export async function createReminder(input: {
  title: string
  dueIso?: string
  notes?: string
}): Promise<string> {
  const duePart = input.dueIso
    ? `set targetDue to date "${new Date(input.dueIso)
        .toLocaleString('sv-SE')
        .replace('T', ' ')}"
       set due date of newReminder to targetDue`
    : ''
  const script = `
tell application "Reminders"
  set targetList to default list
  tell targetList
    set newReminder to make new reminder with properties {name:"${escapeAppleScript(input.title)}", body:"${escapeAppleScript(input.notes ?? '')}"}
    ${duePart}
  end tell
end tell
return "created"`
  await runAppleScript(script)
  return `已创建提醒「${input.title}」`
}

export async function createMailDraft(input: {
  to: string
  subject: string
  body: string
}): Promise<string> {
  const script = `
tell application "Mail"
  set newMessage to make new outgoing message with properties {visible:true, subject:"${escapeAppleScript(
    input.subject
  )}", content:"${escapeAppleScript(input.body)}"}
  tell newMessage
    make new to recipient at end of to recipients with properties {address:"${escapeAppleScript(input.to)}"}
  end tell
  activate
end tell
return "draft"`
  await runAppleScript(script)
  return '邮件草稿已在 Apple Mail 中打开，尚未发送'
}

export async function listContacts(query: string): Promise<Array<{ name: string; email: string }>> {
  const script = `
set output to ""
tell application "Contacts"
  set matches to every person whose name contains "${escapeAppleScript(query)}"
  repeat with p in matches
    try
      set pname to name of p
      set pemail to ""
      if count of emails of p > 0 then set pemail to value of first email of p
      set output to output & pname & tab & pemail & linefeed
    end try
  end repeat
end tell
return output`
  const output = await runAppleScript(script)
  return output
    .split('\n')
    .filter(Boolean)
    .slice(0, 20)
    .map((line) => {
      const [name = '', email = ''] = line.split('\t')
      return { name, email }
    })
}

export async function searchMail(
  query: string,
  limit = 20
): Promise<Array<{ subject: string; sender: string; date: string }>> {
  const needle = escapeAppleScript(query.trim())
  const predicate = needle ? ` whose subject contains "${needle}" or sender contains "${needle}"` : ''
  const script = `
set output to ""
tell application "Mail"
  try
    set matches to messages of inbox${predicate}
    repeat with msg in matches
      try
        set output to output & (subject of msg as text) & tab & (sender of msg as text) & tab & (date sent of msg as text) & linefeed
      end try
    end repeat
  end try
end tell
return output`
  const output = await runAppleScript(script)
  return output
    .split('\n')
    .filter(Boolean)
    .slice(0, Math.max(1, Math.min(50, limit)))
    .map((line) => {
      const [subject = '', sender = '', date = ''] = line.split('\t')
      return { subject, sender, date }
    })
}
