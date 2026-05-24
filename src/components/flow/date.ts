export function formatMessageTime(value?: string) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatInboxTime(value?: string) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  return date.toLocaleString(
    undefined,
    isToday
      ? { timeStyle: 'short' }
      : {
          month: 'short',
          day: 'numeric',
        },
  );
}
