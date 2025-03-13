export default {
  // 代码库根目录
  codeBasePath: 'C:\\Users\\tipbsy\\Desktop\\Elite_Code',
  
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
  maxAnalysisLines: 10000
}; 