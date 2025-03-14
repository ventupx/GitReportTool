export default {
  // 代码库根目录
  codeBasePath: '',
  
  // 周报时间范围（天）
  reportDays: 7,
  
  // 输出格式选项：'markdown', 'json', 'text'
  outputFormat: 'markdown',
  
  // 输出文件路径
  outputPath: './reports',
  
  // 是否包含详细的代码变更分析
  includeCodeAnalysis: true,
  
  // 忽略的文件类型
  ignoreFileTypes: ['.log', '.lock', '.md', '.gitignore', '.DS_Store'],
  
  // 忽略的目录
  ignoreDirs: ['node_modules', 'dist', 'build', '.git', '.idea', '.vscode'],
  
  // 代码分析的最大行数限制（防止分析过大的文件）
  maxAnalysisLines: 10000,
  
  // OpenAI 配置
  openai: {
    // 是否启用 OpenAI 功能
    enabled: true,
    
    // OpenAI API 基础 URL，可以使用官方 API 或自定义 API 端点
    // 使用官方 API 时，baseURL 为 'https://api.openai.com/v1/'
    baseURL: '',
    
    // OpenAI API 密钥，如果不设置则跳过 OpenAI 功能
    apiKey: '',
    
    // 使用的模型
    model: '',
    
    // 温度参数，控制输出的随机性（0-2 之间，越低越确定性，越高越创造性）
    temperature: 0.7,
    
    // 最大输出 token 数
    maxTokens: 1000,
    
    // 提示词模板
    promptTemplate: `
你是一位专业的技术团队经理，负责审阅和总结团队的周报。
请根据以下提供的代码仓库提交记录和变更情况，完成以下任务：

1. 总结本周的主要工作内容和成就
2. 分析可能存在的问题或挑战
3. 对团队的工作进行评价
4. 提出改进建议或下周工作重点

提交记录和变更情况：
{reportContent}

请用中文回答，保持专业、简洁和建设性。回答格式如下：

## AI 周报点评

### 本周工作总结
[总结本周的主要工作内容和成就]

### 问题与挑战
[分析可能存在的问题或挑战]

### 工作评价
[对团队的工作进行评价]

### 改进建议
[提出改进建议或下周工作重点]
`
  }
}; 