import moment from 'moment';
import { DATE_FORMAT_DISPLAY, DATE_FORMAT_INPUT } from '../constants';

/**
 * Format a date string to the standard display format (DD/MM/YYYY)
 */
export const formatDate = (date: string | moment.Moment, format = DATE_FORMAT_DISPLAY): string => {
  return moment(date).format(format);
};

/**
 * Format a date or string to standard ISO format for API payloads
 */
export const toISODateString = (date?: string | Date | moment.Moment): string => {
  if (!date) return '';
  return moment(date).format(DATE_FORMAT_INPUT);
};
