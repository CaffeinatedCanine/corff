module.exports = function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date)) return 'Invalid Date';
  return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
};