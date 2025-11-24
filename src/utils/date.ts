export const formatDate = (dateString: string): string => {
  // Parse as local date to avoid timezone issues
  // Extract just the date part (YYYY-MM-DD) if there's a time component
  const dateOnly = dateString.split('T')[0].split(' ')[0];
  const parts = dateOnly.split('-');
  
  if (parts.length !== 3) {
    // Fallback to original behavior if format is unexpected
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Parse as local date (month is 0-indexed)
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const isPastDate = (dateString: string): boolean => {
  const endDate = new Date(dateString);
  const now = new Date();
  return endDate < now;
};
