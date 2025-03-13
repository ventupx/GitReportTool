import { simpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';
import { isDateInReportRange, formatDate } from '../utils/dateUtils.js';
import config from '../config/default.js';

/**
 * 获取仓库的基本信息
 * @param {string} repoPath 仓库路径
 * @returns {Promise<Object>} 仓库信息
 */
export const getRepositoryInfo = async (repoPath) => {
  const git = simpleGit(repoPath);
  
  try {
    // 检查仓库是否有提交记录
    const hasCommits = await hasAnyCommits(git);
    if (!hasCommits) {
      return {
        path: repoPath,
        name: path.basename(repoPath),
        remote: null,
        currentBranch: await getCurrentBranch(git),
        lastCommitDate: null,
        isEmpty: true
      };
    }
    
    // 获取远程仓库信息
    const remotes = await git.getRemotes(true);
    const remote = remotes.length > 0 ? remotes[0] : null;
    
    // 获取当前分支
    const branch = await git.branch();
    
    // 获取最后一次提交
    const lastCommit = await git.log({ maxCount: 1 });
    
    return {
      path: repoPath,
      name: path.basename(repoPath),
      remote: remote ? remote.refs.fetch : null,
      currentBranch: branch.current,
      lastCommitDate: lastCommit.latest ? formatDate(lastCommit.latest.date) : null,
      isEmpty: false
    };
  } catch (error) {
    console.error(`获取仓库信息时出错: ${repoPath}`, error);
    return {
      path: repoPath,
      name: path.basename(repoPath),
      error: error.message,
      isEmpty: true
    };
  }
};

/**
 * 检查仓库是否有任何提交记录
 * @param {SimpleGit} git SimpleGit 实例
 * @returns {Promise<boolean>} 是否有提交记录
 */
const hasAnyCommits = async (git) => {
  try {
    const result = await git.raw(['rev-parse', 'HEAD']);
    return !!result && result.trim() !== '';
  } catch (error) {
    return false;
  }
};

/**
 * 获取当前分支名称，即使没有提交记录
 * @param {SimpleGit} git SimpleGit 实例
 * @returns {Promise<string>} 分支名称
 */
const getCurrentBranch = async (git) => {
  try {
    const result = await git.raw(['symbolic-ref', '--short', 'HEAD']);
    return result.trim();
  } catch (error) {
    return '未知';
  }
};

/**
 * 获取仓库在指定时间范围内的提交记录
 * @param {string} repoPath 仓库路径
 * @returns {Promise<Array>} 提交记录列表
 */
export const getCommitsInDateRange = async (repoPath) => {
  const git = simpleGit(repoPath);
  
  try {
    // 检查仓库是否有提交记录
    if (!await hasAnyCommits(git)) {
      return [];
    }
    
    // 获取所有提交记录
    const log = await git.log();
    
    // 过滤出在时间范围内的提交
    const filteredCommits = log.all.filter(commit => 
      isDateInReportRange(commit.date)
    );
    
    return filteredCommits.map(commit => ({
      hash: commit.hash,
      date: formatDate(commit.date),
      message: commit.message,
      author: commit.author_name,
      email: commit.author_email,
      isFirstCommit: isFirstCommit(log.all, commit.hash)
    }));
  } catch (error) {
    console.error(`获取提交记录时出错: ${repoPath}`, error);
    return [];
  }
};

/**
 * 检查是否为首次提交
 * @param {Array} allCommits 所有提交记录
 * @param {string} commitHash 提交哈希
 * @returns {boolean} 是否为首次提交
 */
const isFirstCommit = (allCommits, commitHash) => {
  // 找到当前提交在数组中的索引
  const index = allCommits.findIndex(commit => commit.hash === commitHash);
  
  // 如果是数组中的最后一个元素，则认为是首次提交
  // 注意：git log 默认按时间倒序排列，所以最早的提交在数组末尾
  return index === allCommits.length - 1;
};

/**
 * 获取提交的详细变更
 * @param {string} repoPath 仓库路径
 * @param {string} commitHash 提交哈希
 * @param {boolean} isFirstCommit 是否为首次提交
 * @returns {Promise<Object>} 变更详情
 */
export const getCommitDetails = async (repoPath, commitHash, isFirstCommit) => {
  const git = simpleGit(repoPath);
  
  try {
    // 获取提交的详细信息
    const show = await git.show([commitHash]);
    
    // 获取变更的文件列表
    let changedFiles = [];
    
    if (isFirstCommit) {
      // 对于首次提交，使用特殊处理
      const files = await git.raw(['ls-tree', '--name-status', '-r', commitHash]);
      changedFiles = parseFirstCommitFiles(files);
    } else {
      // 对于非首次提交，使用常规方法
      const diff = await git.diff([`${commitHash}^`, commitHash, '--name-status']);
      changedFiles = parseGitDiff(diff);
    }
    
    return {
      hash: commitHash,
      details: show,
      changedFiles
    };
  } catch (error) {
    console.error(`获取提交详情时出错: ${repoPath}, ${commitHash}`, error);
    return {
      hash: commitHash,
      error: error.message
    };
  }
};

/**
 * 解析首次提交的文件列表
 * @param {string} output git ls-tree 输出
 * @returns {Array} 变更文件列表
 */
const parseFirstCommitFiles = (output) => {
  const lines = output.split('\n').filter(line => line.trim() !== '');
  
  return lines.map(line => {
    // 提取文件路径，格式通常是 "100644 blob hash\tfilepath"
    const parts = line.split('\t');
    const filePath = parts.length > 1 ? parts[1] : '';
    
    return {
      path: filePath,
      type: '新增',
      status: 'A'
    };
  });
};

/**
 * 解析 Git diff 输出
 * @param {string} diffOutput Git diff 输出
 * @returns {Array} 变更文件列表
 */
const parseGitDiff = (diffOutput) => {
  const lines = diffOutput.split('\n').filter(line => line.trim() !== '');
  
  return lines.map(line => {
    const [status, ...fileParts] = line.split('\t');
    const filePath = fileParts.join('\t');
    
    let changeType;
    switch (status.charAt(0)) {
      case 'A': changeType = '新增'; break;
      case 'M': changeType = '修改'; break;
      case 'D': changeType = '删除'; break;
      case 'R': changeType = '重命名'; break;
      case 'C': changeType = '复制'; break;
      default: changeType = '未知';
    }
    
    return {
      path: filePath,
      type: changeType,
      status
    };
  });
};

/**
 * 分析代码变更
 * @param {string} repoPath 仓库路径
 * @param {Array} commits 提交记录列表
 * @returns {Promise<Object>} 代码分析结果
 */
export const analyzeCodeChanges = async (repoPath, commits) => {
  if (!config.includeCodeAnalysis || commits.length === 0) {
    return null;
  }
  
  const git = simpleGit(repoPath);
  const analysis = {
    totalCommits: commits.length,
    totalFilesChanged: 0,
    fileTypes: {},
    fileChanges: {
      added: 0,
      modified: 0,
      deleted: 0,
      renamed: 0
    },
    lineChanges: {
      additions: 0,
      deletions: 0
    },
    mostChangedFiles: [],
    commitsByAuthor: {}
  };
  
  // 获取所有变更的文件
  const allChangedFiles = [];
  
  for (const commit of commits) {
    try {
      // 获取变更的文件
      let changedFiles = [];
      
      if (commit.isFirstCommit) {
        // 对于首次提交，使用特殊处理
        const files = await git.raw(['ls-tree', '--name-status', '-r', commit.hash]);
        changedFiles = parseFirstCommitFiles(files);
        
        // 获取首次提交的统计信息
        const show = await git.show([commit.hash, '--stat']);
        // 简单解析统计信息，格式通常是 "n files changed, n insertions(+), n deletions(-)"
        const statMatch = show.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
        
        if (statMatch) {
          analysis.lineChanges.additions += parseInt(statMatch[2] || 0, 10);
          analysis.lineChanges.deletions += parseInt(statMatch[3] || 0, 10);
        }
      } else {
        // 对于非首次提交，使用常规方法
        const stats = await git.diffSummary([`${commit.hash}^`, commit.hash]);
        
        // 更新行变更统计
        analysis.lineChanges.additions += stats.insertions;
        analysis.lineChanges.deletions += stats.deletions;
        
        // 获取变更的文件
        const diff = await git.diff([`${commit.hash}^`, commit.hash, '--name-status']);
        changedFiles = parseGitDiff(diff);
      }
      
      // 更新文件变更统计
      changedFiles.forEach(file => {
        // 统计文件类型
        const ext = path.extname(file.path).toLowerCase();
        if (ext && !config.ignoreFileTypes.includes(ext)) {
          analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1;
        }
        
        // 统计变更类型
        switch (file.type) {
          case '新增': analysis.fileChanges.added++; break;
          case '修改': analysis.fileChanges.modified++; break;
          case '删除': analysis.fileChanges.deleted++; break;
          case '重命名': analysis.fileChanges.renamed++; break;
        }
        
        // 记录变更的文件
        allChangedFiles.push({
          path: file.path,
          type: file.type,
          commit: commit.hash
        });
      });
      
      // 更新作者统计
      const author = commit.author;
      if (!analysis.commitsByAuthor[author]) {
        analysis.commitsByAuthor[author] = {
          commits: 0,
          additions: 0,
          deletions: 0
        };
      }
      analysis.commitsByAuthor[author].commits++;
      
      // 如果是首次提交，我们已经在上面更新了行变更统计
      if (!commit.isFirstCommit) {
        const stats = await git.diffSummary([`${commit.hash}^`, commit.hash]);
        analysis.commitsByAuthor[author].additions += stats.insertions;
        analysis.commitsByAuthor[author].deletions += stats.deletions;
      }
      
    } catch (error) {
      console.error(`分析提交时出错: ${repoPath}, ${commit.hash}`, error);
      // 继续处理下一个提交
    }
  }
  
  // 计算总变更文件数
  analysis.totalFilesChanged = _.uniqBy(allChangedFiles, 'path').length;
  
  // 找出变更最多的文件
  const fileChangeCounts = _.countBy(allChangedFiles, 'path');
  analysis.mostChangedFiles = Object.entries(fileChangeCounts)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return analysis;
}; 