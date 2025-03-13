import _ from 'lodash';
import chalk from 'chalk';
import { getRepositoryInfo, getCommitsInDateRange, analyzeCodeChanges } from './gitService.js';
import { formatDate, getReportStartDate, getReportEndDate } from '../utils/dateUtils.js';
import config from '../config/default.js';

/**
 * 为单个仓库生成报告数据
 * @param {string} repoPath 仓库路径
 * @returns {Promise<Object>} 报告数据
 */
export const generateRepoReport = async (repoPath) => {
  // 获取仓库基本信息
  const repoInfo = await getRepositoryInfo(repoPath);
  
  // 如果获取仓库信息出错，返回错误信息
  if (repoInfo.error) {
    return {
      ...repoInfo,
      commits: [],
      analysis: null
    };
  }
  
  // 如果仓库为空（没有提交记录），直接返回基本信息
  if (repoInfo.isEmpty) {
    return {
      ...repoInfo,
      commits: [],
      analysis: null
    };
  }
  
  // 获取时间范围内的提交记录
  const commits = await getCommitsInDateRange(repoPath);
  
  // 如果没有提交记录，返回基本信息
  if (commits.length === 0) {
    return {
      ...repoInfo,
      commits: [],
      analysis: null
    };
  }
  
  // 分析代码变更
  const analysis = await analyzeCodeChanges(repoPath, commits);
  
  return {
    ...repoInfo,
    commits,
    analysis
  };
};

/**
 * 生成所有仓库的报告
 * @param {Array<string>} repoPaths 仓库路径列表
 * @param {Object} options 选项
 * @returns {Promise<Object>} 完整报告数据
 */
export const generateFullReport = async (repoPaths, options = {}) => {
  const startDate = getReportStartDate();
  const endDate = getReportEndDate();
  
  console.log(`正在生成 ${formatDate(startDate)} 至 ${formatDate(endDate)} 的周报...`);
  console.log(`共发现 ${repoPaths.length} 个 Git 仓库`);
  
  const repoReports = [];
  
  // 为每个仓库生成报告
  for (const repoPath of repoPaths) {
    console.log(`处理仓库: ${repoPath}`);
    const report = await generateRepoReport(repoPath);
    
    // 只包含有提交记录的仓库
    if (report.commits && report.commits.length > 0) {
      repoReports.push(report);
      
      // 打印详细的提交记录
      if (options.verbose) {
        console.log(chalk.blue(`\n${report.name} 的提交记录:`));
        report.commits.forEach(commit => {
          console.log(chalk.blue(`  [${commit.date}] ${commit.author}: ${commit.message}`));
        });
        console.log('');
      }
    }
  }
  
  // 按提交数量排序
  repoReports.sort((a, b) => b.commits.length - a.commits.length);
  
  // 生成汇总统计
  const summary = generateSummaryStats(repoReports);
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    totalRepos: repoPaths.length,
    reposWithCommits: repoReports.length,
    summary,
    repositories: repoReports
  };
};

/**
 * 生成汇总统计数据
 * @param {Array<Object>} repoReports 仓库报告列表
 * @returns {Object} 汇总统计
 */
const generateSummaryStats = (repoReports) => {
  const summary = {
    totalCommits: 0,
    totalFilesChanged: 0,
    totalAdditions: 0,
    totalDeletions: 0,
    commitsByAuthor: {},
    fileTypes: {},
    fileChanges: {
      added: 0,
      modified: 0,
      deleted: 0,
      renamed: 0
    }
  };
  
  // 汇总所有仓库的统计数据
  repoReports.forEach(repo => {
    // 累加提交数
    summary.totalCommits += repo.commits.length;
    
    // 累加代码分析数据
    if (repo.analysis) {
      // 文件变更统计
      summary.totalFilesChanged += repo.analysis.totalFilesChanged;
      summary.totalAdditions += repo.analysis.lineChanges.additions;
      summary.totalDeletions += repo.analysis.lineChanges.deletions;
      
      // 文件类型统计
      Object.entries(repo.analysis.fileTypes).forEach(([type, count]) => {
        summary.fileTypes[type] = (summary.fileTypes[type] || 0) + count;
      });
      
      // 文件变更类型统计
      summary.fileChanges.added += repo.analysis.fileChanges.added;
      summary.fileChanges.modified += repo.analysis.fileChanges.modified;
      summary.fileChanges.deleted += repo.analysis.fileChanges.deleted;
      summary.fileChanges.renamed += repo.analysis.fileChanges.renamed;
      
      // 作者统计
      Object.entries(repo.analysis.commitsByAuthor).forEach(([author, stats]) => {
        if (!summary.commitsByAuthor[author]) {
          summary.commitsByAuthor[author] = {
            commits: 0,
            additions: 0,
            deletions: 0
          };
        }
        
        summary.commitsByAuthor[author].commits += stats.commits;
        summary.commitsByAuthor[author].additions += stats.additions;
        summary.commitsByAuthor[author].deletions += stats.deletions;
      });
    }
  });
  
  return summary;
};

/**
 * 将报告数据转换为 Markdown 格式
 * @param {Object} reportData 报告数据
 * @returns {string} Markdown 格式的报告
 */
export const formatReportAsMarkdown = (reportData) => {
  let markdown = `# Git 代码仓库周报\n\n`;
  
  // 报告时间范围
  markdown += `## 报告概览\n\n`;
  markdown += `- **报告时间范围**: ${reportData.startDate} 至 ${reportData.endDate}\n`;
  markdown += `- **扫描仓库总数**: ${reportData.totalRepos}\n`;
  markdown += `- **有提交的仓库数**: ${reportData.reposWithCommits}\n`;
  markdown += `- **总提交次数**: ${reportData.summary.totalCommits}\n`;
  markdown += `- **变更文件总数**: ${reportData.summary.totalFilesChanged}\n`;
  markdown += `- **代码行变更**: +${reportData.summary.totalAdditions} / -${reportData.summary.totalDeletions}\n\n`;
  
  // 贡献者统计
  markdown += `## 贡献者统计\n\n`;
  
  if (Object.keys(reportData.summary.commitsByAuthor).length > 0) {
    markdown += `| 贡献者 | 提交次数 | 增加行数 | 删除行数 |\n`;
    markdown += `| ------ | -------- | -------- | -------- |\n`;
    
    Object.entries(reportData.summary.commitsByAuthor)
      .sort((a, b) => b[1].commits - a[1].commits)
      .forEach(([author, stats]) => {
        markdown += `| ${author} | ${stats.commits} | ${stats.additions} | ${stats.deletions} |\n`;
      });
    
    markdown += `\n`;
  } else {
    markdown += `*无贡献者数据*\n\n`;
  }
  
  // 文件类型统计
  markdown += `## 文件类型统计\n\n`;
  
  if (Object.keys(reportData.summary.fileTypes).length > 0) {
    markdown += `| 文件类型 | 变更次数 |\n`;
    markdown += `| -------- | -------- |\n`;
    
    Object.entries(reportData.summary.fileTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        markdown += `| ${type} | ${count} |\n`;
      });
    
    markdown += `\n`;
  } else {
    markdown += `*无文件类型统计数据*\n\n`;
  }
  
  // 仓库详情
  markdown += `## 仓库详情\n\n`;
  
  reportData.repositories.forEach(repo => {
    markdown += `### ${repo.name}\n\n`;
    markdown += `- **路径**: ${repo.path}\n`;
    markdown += `- **当前分支**: ${repo.currentBranch}\n`;
    markdown += `- **提交次数**: ${repo.commits.length}\n`;
    
    if (repo.analysis) {
      markdown += `- **变更文件数**: ${repo.analysis.totalFilesChanged}\n`;
      markdown += `- **代码行变更**: +${repo.analysis.lineChanges.additions} / -${repo.analysis.lineChanges.deletions}\n`;
      
      // 变更最多的文件
      if (repo.analysis.mostChangedFiles.length > 0) {
        markdown += `\n#### 变更最多的文件\n\n`;
        markdown += `| 文件路径 | 变更次数 |\n`;
        markdown += `| -------- | -------- |\n`;
        
        repo.analysis.mostChangedFiles.forEach(file => {
          markdown += `| ${file.path} | ${file.count} |\n`;
        });
        
        markdown += `\n`;
      }
    }
    
    // 提交记录
    markdown += `#### 提交记录\n\n`;
    
    if (repo.commits.length > 0) {
      markdown += `| 提交时间 | 作者 | 提交信息 |\n`;
      markdown += `| -------- | ---- | -------- |\n`;
      
      repo.commits.forEach(commit => {
        // 处理提交信息中可能包含的 Markdown 表格分隔符
        const safeMessage = commit.message.replace(/\|/g, '\\|');
        markdown += `| ${commit.date} | ${commit.author} | ${safeMessage} |\n`;
      });
      
      markdown += `\n`;
    } else {
      markdown += `*无提交记录*\n\n`;
    }
    
    markdown += `\n`;
  });
  
  return markdown;
};

/**
 * 将报告数据转换为 JSON 格式
 * @param {Object} reportData 报告数据
 * @returns {string} JSON 格式的报告
 */
export const formatReportAsJson = (reportData) => {
  return JSON.stringify(reportData, null, 2);
};

/**
 * 将报告数据转换为纯文本格式
 * @param {Object} reportData 报告数据
 * @returns {string} 纯文本格式的报告
 */
export const formatReportAsText = (reportData) => {
  let text = `Git 代码仓库周报\n\n`;
  
  // 报告时间范围
  text += `报告概览\n`;
  text += `==========\n\n`;
  text += `报告时间范围: ${reportData.startDate} 至 ${reportData.endDate}\n`;
  text += `扫描仓库总数: ${reportData.totalRepos}\n`;
  text += `有提交的仓库数: ${reportData.reposWithCommits}\n`;
  text += `总提交次数: ${reportData.summary.totalCommits}\n`;
  text += `变更文件总数: ${reportData.summary.totalFilesChanged}\n`;
  text += `代码行变更: +${reportData.summary.totalAdditions} / -${reportData.summary.totalDeletions}\n\n`;
  
  // 贡献者统计
  text += `贡献者统计\n`;
  text += `==========\n\n`;
  
  if (Object.keys(reportData.summary.commitsByAuthor).length > 0) {
    Object.entries(reportData.summary.commitsByAuthor)
      .sort((a, b) => b[1].commits - a[1].commits)
      .forEach(([author, stats]) => {
        text += `${author}: ${stats.commits} 次提交, +${stats.additions} / -${stats.deletions} 行\n`;
      });
    
    text += `\n`;
  } else {
    text += `无贡献者数据\n\n`;
  }
  
  // 文件类型统计
  text += `文件类型统计\n`;
  text += `==========\n\n`;
  
  if (Object.keys(reportData.summary.fileTypes).length > 0) {
    Object.entries(reportData.summary.fileTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        text += `${type}: ${count} 次变更\n`;
      });
    
    text += `\n`;
  } else {
    text += `无文件类型统计数据\n\n`;
  }
  
  // 仓库详情
  text += `仓库详情\n`;
  text += `==========\n\n`;
  
  reportData.repositories.forEach(repo => {
    text += `${repo.name}\n`;
    text += `----------\n\n`;
    text += `路径: ${repo.path}\n`;
    text += `当前分支: ${repo.currentBranch}\n`;
    text += `提交次数: ${repo.commits.length}\n`;
    
    if (repo.analysis) {
      text += `变更文件数: ${repo.analysis.totalFilesChanged}\n`;
      text += `代码行变更: +${repo.analysis.lineChanges.additions} / -${repo.analysis.lineChanges.deletions}\n`;
      
      // 变更最多的文件
      if (repo.analysis.mostChangedFiles.length > 0) {
        text += `\n变更最多的文件:\n`;
        
        repo.analysis.mostChangedFiles.forEach(file => {
          text += `- ${file.path}: ${file.count} 次变更\n`;
        });
        
        text += `\n`;
      }
    }
    
    // 提交记录
    text += `提交记录:\n`;
    
    if (repo.commits.length > 0) {
      repo.commits.forEach(commit => {
        text += `- ${commit.date} | ${commit.author} | ${commit.message}\n`;
      });
      
      text += `\n`;
    } else {
      text += `无提交记录\n\n`;
    }
    
    text += `\n`;
  });
  
  return text;
};

/**
 * 根据配置的输出格式格式化报告
 * @param {Object} reportData 报告数据
 * @returns {string} 格式化后的报告
 */
export const formatReport = (reportData) => {
  switch (config.outputFormat.toLowerCase()) {
    case 'markdown':
      return formatReportAsMarkdown(reportData);
    case 'json':
      return formatReportAsJson(reportData);
    case 'text':
      return formatReportAsText(reportData);
    default:
      return formatReportAsMarkdown(reportData);
  }
}; 