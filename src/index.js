#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { findAllGitRepositories, writeReport } from './utils/fileUtils.js';
import { generateFullReport, formatReport } from './services/reportService.js';
import { generateReportFilename } from './utils/dateUtils.js';
import config from './config/default.js';

// 创建命令行程序
const program = new Command();

// 设置版本和描述
program
  .name('git-report-tool')
  .description('一个用于生成代码仓库周报的工具')
  .version('1.0.0');

// 添加选项
program
  .option('-d, --days <days>', '设置报告的时间范围（天数）', config.reportDays)
  .option('-p, --path <path>', '设置代码库根目录', config.codeBasePath)
  .option('-o, --output <path>', '设置输出目录', config.outputPath)
  .option('-f, --format <format>', '设置输出格式 (markdown, json, text)', config.outputFormat)
  .option('--no-analysis', '不包含代码变更分析')
  .option('-c, --config <path>', '指定配置文件路径')
  .option('--no-verbose', '不显示详细日志信息')
  .option('--ignore-errors', '忽略错误并继续执行');

// 解析命令行参数
program.parse();
const options = program.opts();

// 确保 verbose 选项默认为 true
if (options.verbose === undefined) {
  options.verbose = true;
}

// 更新配置
if (options.config) {
  try {
    const customConfigPath = path.resolve(options.config);
    if (fs.existsSync(customConfigPath)) {
      console.log(chalk.blue(`正在加载配置文件: ${customConfigPath}`));
      const customConfig = await import(customConfigPath);
      Object.assign(config, customConfig.default);
    } else {
      console.error(chalk.red(`配置文件不存在: ${customConfigPath}`));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`加载配置文件时出错: ${error.message}`));
    process.exit(1);
  }
}

// 应用命令行选项
if (options.days) config.reportDays = parseInt(options.days, 10);
if (options.path) config.codeBasePath = options.path;
if (options.output) config.outputPath = options.output;
if (options.format) config.outputFormat = options.format;
if (options.analysis === false) config.includeCodeAnalysis = false;

// 日志函数
const log = {
  info: (message) => console.log(chalk.blue(message)),
  success: (message) => console.log(chalk.green(message)),
  warning: (message) => console.log(chalk.yellow(message)),
  error: (message) => console.error(chalk.red(message)),
  verbose: (message) => {
    if (options.verbose) {
      console.log(chalk.gray(`[详细] ${message}`));
    }
  }
};

/**
 * 主函数
 */
async function main() {
  try {
    log.info('Git 代码仓库周报生成工具');
    log.info('=======================');
    
    // 检查代码库路径是否存在
    const rootDir = path.resolve(config.codeBasePath);
    if (!await fs.pathExists(rootDir)) {
      log.error(`代码库路径不存在: ${rootDir}`);
      process.exit(1);
    }
    
    log.info(`正在扫描代码库: ${rootDir}`);
    
    // 查找所有 Git 仓库
    const repositories = await findAllGitRepositories(rootDir);
    
    if (repositories.length === 0) {
      log.warning('未找到任何 Git 仓库');
      process.exit(0);
    }
    
    log.info(`共找到 ${repositories.length} 个 Git 仓库`);
    
    if (options.verbose) {
      repositories.forEach(repo => {
        log.verbose(`发现仓库: ${repo}`);
      });
    }
    
    // 生成报告
    log.info('正在生成报告...');
    const reportData = await generateFullReport(repositories, { verbose: options.verbose });
    
    // 格式化报告
    log.info('正在格式化报告...');
    const reportContent = formatReport(reportData);
    
    // 生成报告文件名
    const filename = generateReportFilename();
    
    // 写入报告
    log.info('正在写入报告...');
    const reportPath = await writeReport(reportContent, filename);
    
    log.success(`报告生成成功: ${reportPath}`);
    log.info(`扫描仓库总数: ${reportData.totalRepos}`);
    log.info(`有提交的仓库数: ${reportData.reposWithCommits}`);
    log.info(`总提交次数: ${reportData.summary.totalCommits}`);
    
    if (reportData.reposWithCommits === 0) {
      log.warning('在指定时间范围内没有发现任何提交记录');
    } else {
      log.success('周报生成完成！');
    }
    
  } catch (error) {
    log.error(`生成报告时出错: ${error.message}`);
    
    if (options.verbose) {
      log.error(error.stack);
    } else {
      log.error('使用 --verbose 选项可查看详细错误信息');
    }
    
    process.exit(1);
  }
}

// 设置全局错误处理
process.on('uncaughtException', (error) => {
  log.error(`未捕获的异常: ${error.message}`);
  
  if (options.verbose) {
    log.error(error.stack);
  }
  
  if (!options.ignoreErrors) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log.error(`未处理的 Promise 拒绝: ${reason}`);
  
  if (options.verbose) {
    log.error(reason.stack);
  }
  
  if (!options.ignoreErrors) {
    process.exit(1);
  }
});

// 执行主函数
main(); 