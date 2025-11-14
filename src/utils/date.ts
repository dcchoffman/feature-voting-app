export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
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
