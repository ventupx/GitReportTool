import moment from 'moment';
import config from '../config/default.js';

/**
 * 获取周报的开始日期
 * @returns {moment.Moment} 开始日期
 */
export const getReportStartDate = () => {
  return moment().subtract(config.reportDays, 'days').startOf('day');
};

/**
 * 获取周报的结束日期
 * @returns {moment.Moment} 结束日期
 */
export const getReportEndDate = () => {
  return moment().endOf('day');
};

/**
 * 格式化日期为易读格式
 * @param {moment.Moment|Date|string} date 日期
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (date) => {
  return moment(date).format('YYYY-MM-DD HH:mm:ss');
};

/**
 * 生成报告文件名
 * @returns {string} 报告文件名
 */
export const generateReportFilename = () => {
  const startDate = getReportStartDate().format('YYYYMMDD');
  const endDate = getReportEndDate().format('YYYYMMDD');
  return `git-report-${startDate}-to-${endDate}.${config.outputFormat === 'markdown' ? 'md' : config.outputFormat}`;
};

/**
 * 检查日期是否在报告时间范围内
 * @param {moment.Moment|Date|string} date 日期
 * @returns {boolean} 是否在范围内
 */
export const isDateInReportRange = (date) => {
  const momentDate = moment(date);
  return momentDate.isSameOrAfter(getReportStartDate()) && 
         momentDate.isSameOrBefore(getReportEndDate());
}; 