function dateToICSFormat(date: Date) {
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  const formatDate = `${date.getUTCFullYear()}${pad(
    date.getUTCMonth() + 1
  )}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(
    date.getUTCMinutes()
  )}${pad(date.getUTCSeconds())}Z`;

  return formatDate;
}

export function timeOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
) {
  return start1 < end2 && start2 < end1;
}

interface IICSInput {
  email: string;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  sequence?: number;
  lastModified?: Date;
}

export function generateICS(events: IICSInput[]) {
  const vevents = events
    .map((event, index) => {
      const start = dateToICSFormat(new Date(event.startTime));
      const end = dateToICSFormat(
        event.endTime
          ? new Date(event.endTime)
          : new Date(new Date(event.startTime).getTime() + 60 * 60_000) // default 1 hour
      );
      const modified = dateToICSFormat(event.lastModified ?? new Date());

      return `BEGIN:VEVENT
UID:${`event-${index}-${dateToICSFormat(new Date())}`}
SUMMARY:${event.name}
DESCRIPTION:${event.description ?? ""}
DTSTART:${start}
DTEND:${end}
DTSTAMP:${modified}
SEQUENCE:${event.sequence ?? 0}
LOCATION:${event.location ?? ""}
STATUS:CONFIRMED
ORGANIZER:mailto:${event.email}
BEGIN:VALARM
TRIGGER:-PT10M
DESCRIPTION:Reminder
ACTION:DISPLAY
END:VALARM
END:VEVENT`;
    })
    .join("\n");

  return `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
${vevents}
END:VCALENDAR`;
}
