# Git 代码仓库周报生成工具

这是一个用于生成代码仓库周报的 Node.js 工具，可以扫描指定目录下的所有 Git 仓库，提取最近一周的提交记录，并生成详细的周报。

## 功能特点

- 递归扫描指定目录下的所有 Git 仓库
- 提取指定时间范围内的提交记录
- 分析代码变更情况，包括文件类型、变更行数等
- 支持多种输出格式：Markdown、JSON、纯文本
- 可通过命令行参数或配置文件自定义行为
- 智能处理空仓库和首次提交
- 详细的错误处理和日志输出
- 彩色控制台输出，提高可读性
- 默认显示详细的提交记录
- 集成 OpenAI，自动生成周报点评和工作建议

## 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/git-report-tool.git
cd git-report-tool

# 安装依赖
pnpm install

# 全局安装（可选）
pnpm link --global
```

## 使用方法

### 基本用法

```bash
# 使用默认配置
pnpm start

# 或者如果全局安装了
git-report-tool
```

### 命令行选项

```bash
# 查看帮助
pnpm start --help

# 指定代码库路径
pnpm start --path /path/to/your/code

# 指定报告时间范围（天数）
pnpm start --days 14

# 指定输出目录
pnpm start --output ./my-reports

# 指定输出格式
pnpm start --format markdown  # 可选: markdown, json, text

# 不包含代码变更分析
pnpm start --no-analysis

# 指定配置文件
pnpm start --config ./my-config.js

# 不显示详细日志信息
pnpm start --no-verbose

# 忽略错误并继续执行
pnpm start --ignore-errors
```

## 详细模式

工具默认启用详细模式，会显示以下信息：

- 发现的所有 Git 仓库列表
- 每个仓库的详细提交记录（蓝色显示）
- 详细的错误信息和堆栈跟踪
- 处理过程中的详细日志

如果不需要这些详细信息，可以使用 `--no-verbose` 选项关闭详细模式。

## OpenAI 集成

工具集成了 OpenAI API，可以自动生成周报点评和工作建议。要启用此功能，需要在配置文件中设置 OpenAI API 密钥：

```javascript
// 在 src/config/default.js 中设置
openai: {
  enabled: true,
  baseURL: 'https://api.openai.com/v1',
  apiKey: '你的 OpenAI API 密钥',
  model: 'gpt-3.5-turbo'  // 或其他支持的模型
}
```

如果未设置 API 密钥，工具会跳过 AI 点评功能。

### AI 点评功能

启用 OpenAI 集成后，工具会：

1. 分析周报内容，包括提交记录和代码变更
2. 总结本周的主要工作内容和成就
3. 分析可能存在的问题或挑战
4. 对团队的工作进行评价
5. 提出改进建议或下周工作重点

AI 点评会添加到生成的报告末尾，格式如下：

```markdown
## AI 周报点评

### 本周工作总结
[总结本周的主要工作内容和成就]

### 问题与挑战
[分析可能存在的问题或挑战]

### 工作评价
[对团队的工作进行评价]

### 改进建议
[提出改进建议或下周工作重点]
```

## 配置文件

默认配置文件位于 `src/config/default.js`，您可以创建自己的配置文件并通过 `--config` 选项指定。

配置文件示例：

```javascript
export default {
  // 代码库根目录
  codeBasePath: 'C:\\Users\\username\\Desktop\\Code',
  
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
  
  // 代码分析的最大行数限制
  maxAnalysisLines: 10000,
  
  // OpenAI 配置
  openai: {
    // 是否启用 OpenAI 功能
    enabled: true,
    
    // OpenAI API 基础 URL
    baseURL: 'https://api.openai.com/v1',
    
    // OpenAI API 密钥
    apiKey: '',
    
    // 使用的模型
    model: 'gpt-3.5-turbo',
    
    // 温度参数（0-2 之间）
    temperature: 0.7
  }
};
```

## 错误处理

工具会自动处理以下情况：

- 空仓库（没有提交记录的仓库）
- 首次提交（没有父提交的提交）
- 无效的 Git 仓库
- 访问权限问题
- OpenAI API 调用失败

详细模式下会显示完整的错误信息和堆栈跟踪，使用 `--ignore-errors` 选项可以在遇到错误时继续执行。

## 输出示例

### Markdown 格式

生成的 Markdown 报告包含以下内容：

- 报告概览（时间范围、仓库数量、提交次数等）
- 贡献者统计（每个贡献者的提交次数、代码行变更等）
- 文件类型统计（各种文件类型的变更次数）
- 仓库详情（每个仓库的提交记录、变更文件等）
- AI 周报点评（如果启用了 OpenAI 功能）

### JSON 格式

JSON 格式包含完整的报告数据，方便进一步处理或集成到其他系统。

### 纯文本格式

纯文本格式提供简洁的报告内容，适合在终端中查看或发送邮件。

## 许可证

MIT 