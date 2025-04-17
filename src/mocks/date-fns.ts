
// This is a mock implementation for date-fns functions
// It's a temporary solution until the actual package can be installed

export const format = (date: Date | number, formatStr: string): string => {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
};

export const parse = (dateString: string): Date => {
  return new Date(dateString);
};

export const isValid = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

export const addDays = (date: Date | number, amount: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
};

export const subDays = (date: Date | number, amount: number): Date => {
  return addDays(date, -amount);
};

export const differenceInDays = (dateLeft: Date | number, dateRight: Date | number): number => {
  const dl = new Date(dateLeft).getTime();
  const dr = new Date(dateRight).getTime();
  return Math.round((dl - dr) / (1000 * 60 * 60 * 24));
};

export const startOfDay = (date: Date | number): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfDay = (date: Date | number): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};
