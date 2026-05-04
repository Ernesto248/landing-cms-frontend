const HAVANA_TIME_ZONE = "America/Havana";

const havanaDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: HAVANA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

function formatIsoDateFromUtcDate(date: Date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function getPartsRecord(date: Date) {
  return Object.fromEntries(
    havanaDateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
}

function getTimeZoneOffsetMinutes(instant: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return (asUtc - instant.getTime()) / 60000;
}

function formatOffset(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = pad2(Math.floor(absoluteMinutes / 60));
  const minutes = pad2(absoluteMinutes % 60);
  return `${sign}${hours}:${minutes}`;
}

export function getHavanaIsoDate(value: Date | string = new Date()) {
  const parts = getPartsRecord(typeof value === "string" ? new Date(value) : value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getHavanaMonthKey(value: Date | string = new Date()) {
  const parts = getPartsRecord(typeof value === "string" ? new Date(value) : value);
  return `${parts.year}-${parts.month}`;
}

export function getHavanaTime(value: Date | string) {
  const parts = getPartsRecord(typeof value === "string" ? new Date(value) : value);
  return `${parts.hour}:${parts.minute}`;
}

export function getHavanaDateTimeParts(value: Date | string) {
  const input = typeof value === "string" ? new Date(value) : value;
  return {
    date: getHavanaIsoDate(input),
    time: getHavanaTime(input),
  };
}

export function addMonthsToIsoDate(isoDate: string, amount: number) {
  const { year, month, day } = parseIsoDate(isoDate);
  return formatIsoDateFromUtcDate(new Date(Date.UTC(year, month - 1 + amount, day)));
}

export function getMonthBoundsFromKey(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = `${year}-${pad2(month)}-01`;
  const lastDay = formatIsoDateFromUtcDate(new Date(Date.UTC(year, month, 0)));
  return { firstDay, lastDay, year, month };
}

export function toHavanaOffsetDateTime(date: string, time: string) {
  const { year, month, day } = parseIsoDate(date);
  const [hours, minutes] = time.split(":").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, 0);

  let offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcGuess), HAVANA_TIME_ZONE);
  let resolvedInstant = new Date(utcGuess - offsetMinutes * 60000);

  const refinedOffsetMinutes = getTimeZoneOffsetMinutes(resolvedInstant, HAVANA_TIME_ZONE);
  if (refinedOffsetMinutes !== offsetMinutes) {
    offsetMinutes = refinedOffsetMinutes;
    resolvedInstant = new Date(utcGuess - offsetMinutes * 60000);
  }

  void resolvedInstant;
  return `${date}T${time}:00${formatOffset(offsetMinutes)}`;
}
