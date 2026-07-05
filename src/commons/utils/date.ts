import moment from 'moment';
import { DATE_FORMAT_DISPLAY } from '../constants/date';

/**
 * Format a date string to the standard display format (DD/MM/YYYY)
 */
export const formatDate = (date: string | moment.Moment, format = DATE_FORMAT_DISPLAY): string => {
  return moment(date).format(format);
};

/**
 * Format a date or string to standard ISO format for API payloads
 */
export const toISODateString = (date?: string | moment.Moment): string => {
  return moment(date).toISOString();
};

/**
 * Compare two date strings for sorting in descending order (newest first)
 */
export const compareDatesDesc = (dateA: string, dateB: string): number => {
  return moment(dateB).valueOf() - moment(dateA).valueOf();
};

/**
 * Parse date or return moment instance
 */
export const parseToMoment = (date?: string): moment.Moment => {
  return moment(date);
};
