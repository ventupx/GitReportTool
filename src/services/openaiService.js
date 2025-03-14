import OpenAI from 'openai';
import config from '../config/default.js';
import chalk from 'chalk';

/**
 * 创建 OpenAI 客户端实例
 * @returns {OpenAI|null} OpenAI 客户端实例或 null
 */
const createOpenAIClient = () => {
  const { openai } = config;
  
  // 如果未启用 OpenAI 功能或未设置 API 密钥，则返回 null
  if (!openai.enabled || !openai.apiKey) {
    return null;
  }
  
  try {
    return new OpenAI({
      apiKey: openai.apiKey,
      baseURL: openai.baseURL
    });
  } catch (error) {
    console.error(chalk.red(`创建 OpenAI 客户端时出错: ${error.message}`));
    return null;
  }
};

/**
 * 使用 OpenAI 生成周报点评（流式输出）
 * @param {string} reportContent 周报内容
 * @returns {Promise<string|null>} 生成的点评内容或 null
 */
export const generateReportReview = async (reportContent) => {
  const { openai } = config;
  
  // 如果未启用 OpenAI 功能或未设置 API 密钥，则跳过
  if (!openai.enabled) {
    console.log(chalk.yellow('OpenAI 功能未启用，跳过生成周报点评'));
    return null;
  }
  
  if (!openai.apiKey) {
    console.log(chalk.yellow('未设置 OpenAI API 密钥，跳过生成周报点评'));
    return null;
  }
  
  // 创建 OpenAI 客户端
  const client = createOpenAIClient();
  if (!client) {
    return null;
  }
  
  try {
    console.log(chalk.blue('正在使用 OpenAI 生成周报点评...'));
    console.log(chalk.blue('正在流式接收 AI 生成内容：'));
    console.log(chalk.cyan('----------------------------------------'));
    
    // 准备提示词
    const prompt = openai.promptTemplate.replace('{reportContent}', reportContent);
    
    // 使用流式输出调用 OpenAI API
    const stream = await client.chat.completions.create({
      model: openai.model,
      messages: [
        { role: 'system', content: '你是一位专业的技术团队经理，负责审阅和总结团队的周报。' },
        { role: 'user', content: prompt }
      ],
      temperature: openai.temperature,
      max_tokens: openai.maxTokens,
      stream: true // 启用流式输出
    });
    
    // 收集完整的响应
    let fullContent = '';
    
    // 处理流式响应
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // 在控制台实时打印内容
        process.stdout.write(chalk.cyan(content));
        // 收集完整内容
        fullContent += content;
      }
    }
    
    console.log('\n' + chalk.cyan('----------------------------------------'));
    console.log(chalk.green('周报点评生成成功'));
    
    return fullContent;
    
  } catch (error) {
    console.error(chalk.red(`生成周报点评时出错: ${error.message}`));
    if (error.response) {
      console.error(chalk.red(`OpenAI API 错误: ${JSON.stringify(error.response.data)}`));
    }
    return null;
  }
}; 