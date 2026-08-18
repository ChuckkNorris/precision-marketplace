// Error collector. Every check takes a report and appends to it rather than
// throwing, so one run surfaces every problem instead of the first.

export function createReport() {
  const errors = [];
  return {
    errors,
    fail(message) {
      errors.push(message);
    },
  };
}
