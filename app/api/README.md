# API Route 扩展边界

当前阶段不创建真实 API Route。后续可按领域拆分为：

- `/api/auth/*`
- `/api/sync/*`
- `/api/ai/*`
- `/api/data/*`

所有写入接口应统一处理用户身份、数据版本、幂等性和错误格式。

