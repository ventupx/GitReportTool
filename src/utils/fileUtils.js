import fs from 'fs-extra';
import path from 'path';
import config from '../config/default.js';

/**
 * 检查路径是否为 Git 仓库
 * @param {string} dirPath 目录路径
 * @returns {boolean} 是否为 Git 仓库
 */
export const isGitRepository = async (dirPath) => {
  const gitDir = path.join(dirPath, '.git');
  try {
    return await fs.pathExists(gitDir);
  } catch (error) {
    console.error(`检查 Git 仓库时出错: ${dirPath}`, error);
    return false;
  }
};

/**
 * 递归查找所有 Git 仓库
 * @param {string} rootDir 根目录
 * @returns {Promise<string[]>} Git 仓库路径列表
 */
export const findAllGitRepositories = async (rootDir) => {
  const repositories = [];
  
  try {
    // 检查当前目录是否为 Git 仓库
    if (await isGitRepository(rootDir)) {
      repositories.push(rootDir);
      return repositories; // 如果当前目录是 Git 仓库，不再递归查找子目录
    }
    
    // 获取目录下的所有条目
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    
    // 递归处理所有子目录
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // 跳过忽略的目录
        if (config.ignoreDirs.includes(entry.name)) {
          continue;
        }
        
        const fullPath = path.join(rootDir, entry.name);
        const subDirRepos = await findAllGitRepositories(fullPath);
        repositories.push(...subDirRepos);
      }
    }
    
    return repositories;
  } catch (error) {
    console.error(`查找 Git 仓库时出错: ${rootDir}`, error);
    return repositories;
  }
};

/**
 * 确保输出目录存在
 * @returns {Promise<string>} 输出目录路径
 */
export const ensureOutputDir = async () => {
  const outputDir = path.resolve(config.outputPath);
  await fs.ensureDir(outputDir);
  return outputDir;
};

/**
 * 写入报告文件
 * @param {string} content 报告内容
 * @param {string} filename 文件名
 * @returns {Promise<string>} 文件路径
 */
export const writeReport = async (content, filename) => {
  const outputDir = await ensureOutputDir();
  const filePath = path.join(outputDir, filename);
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}; 