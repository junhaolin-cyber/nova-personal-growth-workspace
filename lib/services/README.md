# 服务层扩展边界

当前阶段不实现具体服务，页面只使用 Mock Data。后续建议按以下边界接入：

- `auth/`：登录、退出、会话和用户身份；
- `database/`：云数据库客户端和 Repository；
- `sync/`：设备注册、增量同步、冲突处理和离线队列；
- `ai/`：AI Provider、Prompt 和模型调用；
- `pwa/`：Manifest、Service Worker 和离线缓存策略。

页面组件只依赖领域类型和服务接口，不直接依赖具体供应商，方便未来替换认证、数据库或同步方案。

