function parseTimeInput(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    throw new Error("Time is required.");
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) {
    throw new Error("Use time like `18:00` or `6:00 PM`.");
  }

  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const suffix = match[3] ? match[3].toUpperCase() : null;

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute > 59) {
    throw new Error("Invalid time.");
  }

  if (suffix) {
    if (hour < 1 || hour > 12) {
      throw new Error("Invalid 12-hour time.");
    }
    if (suffix === "AM") {
      hour = hour === 12 ? 0 : hour;
    } else {
      hour = hour === 12 ? 12 : hour + 12;
    }
  } else if (hour > 23) {
    throw new Error("Invalid 24-hour time.");
  }

  return { hour, minute };
}

function parseDateInput(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("Use date like `2026-03-31`.");
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + 1 !== month ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error("Invalid calendar date.");
  }

  return { year, month, day };
}

function getOffsetMinutes(timeZone, date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const offsetValue =
    parts.find((part) => part.type === "timeZoneName")?.value || "GMT+00:00";
  const match = offsetValue.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = Number.parseInt(match[3] || "0", 10);
  return sign * (hours * 60 + minutes);
}

function getLocalParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number.parseInt(parts.year, 10),
    month: Number.parseInt(parts.month, 10),
    day: Number.parseInt(parts.day, 10),
    hour: Number.parseInt(parts.hour, 10),
    minute: Number.parseInt(parts.minute, 10),
  };
}

function zonedDateTimeToUtcMs(dateInput, timeInput, timeZone) {
  const { year, month, day } = parseDateInput(dateInput);
  const { hour, minute } = parseTimeInput(timeInput);
  let guess = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offsetMinutes = getOffsetMinutes(timeZone, new Date(guess));
    const nextGuess =
      Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60 * 1000;
    if (nextGuess === guess) {
      break;
    }
    guess = nextGuess;
  }

  const localParts = getLocalParts(new Date(guess), timeZone);
  if (
    localParts.year !== year ||
    localParts.month !== month ||
    localParts.day !== day ||
    localParts.hour !== hour ||
    localParts.minute !== minute
  ) {
    throw new Error(
      `That date/time is not valid in ${timeZone}. Try another time.`,
    );
  }

  return guess;
}

function formatDateInput(timestampMs, timeZone) {
  const parts = getLocalParts(new Date(timestampMs), timeZone);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function formatTimeInput(timestampMs, timeZone) {
  const parts = getLocalParts(new Date(timestampMs), timeZone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function formatScheduleLabel(timestampMs, timeZone) {
  if (!Number.isFinite(timestampMs)) {
    return "Not Scheduled";
  }

  return `<t:${Math.floor(timestampMs / 1000)}:F> (${timeZone})`;
}

function parseTimestampInput(timestampValue) {
  if (Number.isFinite(timestampValue)) {
    return timestampValue;
  }

  const parsed = Date.parse(String(timestampValue || ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDetailedTimestampLabel(timestampValue) {
  const timestampMs = parseTimestampInput(timestampValue);
  if (!Number.isFinite(timestampMs)) {
    return "Unknown";
  }

  const unix = Math.floor(timestampMs / 1000);
  return `<t:${unix}:F>`;
}

module.exports = {
  formatDateInput,
  formatDetailedTimestampLabel,
  formatScheduleLabel,
  formatTimeInput,
  zonedDateTimeToUtcMs,
};
