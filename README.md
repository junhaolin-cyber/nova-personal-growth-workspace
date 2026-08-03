# NOVA · 个人 AI 成长工作台

NOVA 是一个面向个人长期使用的 AI 智能成长工作台，目标是将生活管理、学习成长、知识沉淀和信息管理集中到一个清晰、安静、可持续使用的空间中。

当前版本为第一阶段基础框架，暂不接入数据库和真实 AI 能力，页面使用 Mock Data，并已预留后续扩展位置。

## 当前内容

- Dashboard 总览首页
- 左侧导航栏和顶部导航栏
- 今日计划、英语学习、AI 口语、理财学习等 11 个模块入口
- 每个模块独立路由和基础占位页
- 潮流运动、电影电视两个新增模块入口
- 默认简体中文 UI
- 顶部中文 / English 语言切换
- 可复用 AppShell、导航项、模块卡片和页面占位组件
- Dashboard 视觉参考稿

## 技术栈

- Next.js
- React
- TypeScript
- Tailwind CSS
- lucide-react

## 本地运行

请先安装 Node.js 的 LTS 版本，然后在项目目录执行：

```bash
npm install
npm run dev
```

打开浏览器访问：

```text
http://localhost:3000
```

如果使用 pnpm：

```bash
pnpm install
pnpm dev
```

## 构建检查

```bash
npx tsc --noEmit
npm run build
```

## 项目目录

```text
app/
├─ page.tsx                 # Dashboard 首页
├─ layout.tsx               # 全局布局和 Metadata
├─ globals.css              # 全局样式和 Tailwind 入口
└─ [module]/page.tsx        # 功能模块通用入口

components/
├─ layout/AppShell.tsx      # 页面外壳、导航和语言切换
└─ dashboard/Dashboard.tsx  # Dashboard 首页内容

lib/
└─ modules.ts               # 模块定义和 Mock Data

public/concepts/
└─ dashboard-concept.png    # Dashboard 视觉参考
```

## 上传到 GitHub

在 GitHub 创建一个空仓库后，在项目目录执行：

```bash
git init
git add .
git commit -m "初始化 NOVA 个人成长工作台"
git branch -M main
git remote add origin <你的 GitHub 仓库地址>
git push -u origin main
```

然后可以在 Vercel 中导入该 GitHub 仓库进行线上部署。

## 后续规划

1. 建立全局数据模型和本地持久化层；
2. 完善今日计划和任务管理；
3. 增加 AI Service、Prompt 和 API Route 目录；
4. 接入 AI 助手与英语口语练习；
5. 根据个人数据规模选择 IndexedDB、SQLite 或云端数据库。
