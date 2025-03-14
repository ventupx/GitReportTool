#!/usr/bin/env node

/**
 * 为已有的报告生成 AI 点评
 * 
 * 用法：node generate-review.js <报告文件路径>
 */

const fs = require('fs');
const path = require('path');
const { generateReportReview } = require('../services/openaiService');
const { loadConfig } = require('../utils/configLoader');

// 加载配置
let config;
try {
  config = loadConfig();
} catch (error) {
  console.error('加载配置文件失败:', error.message);
  process.exit(1);
}

// 检查 OpenAI 配置
if (!config.openai || !config.openai.apiKey) {
  console.error('错误: 未设置 OpenAI API 密钥。请在配置文件中设置 openai.apiKey。');
  process.exit(1);
}

async function main() {
  // 获取命令行参数
  const reportPath = process.argv[2];
  
  if (!reportPath) {
    console.error('错误: 请提供报告文件路径');
    console.log('用法: node generate-review.js <报告文件路径>');
    process.exit(1);
  }
  
  // 检查文件是否存在
  if (!fs.existsSync(reportPath)) {
    console.error(`错误: 文件 "${reportPath}" 不存在`);
    process.exit(1);
  }
  
  try {
    // 读取报告内容
    const reportContent = fs.readFileSync(reportPath, 'utf8');
    
    console.log('正在生成 AI 点评...');
    console.log('这可能需要一些时间，请耐心等待...');
    console.log('-------------------------------------------');
    
    // 生成 AI 点评
    const aiReview = await generateReportReview(reportContent, config.openai);
    
    console.log('-------------------------------------------');
    console.log('AI 点评生成完成！');
    
    // 确定输出文件路径
    const reportDir = path.dirname(reportPath);
    const reportBasename = path.basename(reportPath, path.extname(reportPath));
    const reviewPath = path.join(reportDir, `${reportBasename}_review${path.extname(reportPath)}`);
    
    // 将原始报告和 AI 点评合并
    const contentWithReview = `${reportContent}\n\n## AI 点评\n\n${aiReview}`;
    
    // 写入文件
    fs.writeFileSync(reviewPath, contentWithReview);
    
    console.log(`已将带有 AI 点评的报告保存到: ${reviewPath}`);
  } catch (error) {
    console.error('生成 AI 点评时出错:', error.message);
    process.exit(1);
  }
}

main(); 