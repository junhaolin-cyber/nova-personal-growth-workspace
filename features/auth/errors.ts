export function getAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("invalid login credentials")) return "邮箱或密码不正确，请重新检查。";
  if (message.includes("email not confirmed")) return "邮箱还没有完成验证，请先查收验证邮件。";
  if (message.includes("user already registered")) return "这个邮箱已经注册，请直接登录。";
  if (message.includes("password should be at least")) return "密码长度不足，请设置更安全的密码。";
  if (message.includes("same password")) return "新密码不能与旧密码相同。";
  if (message.includes("rate limit") || message.includes("too many")) return "操作过于频繁，请稍后再试。";
  if (message.includes("expired") || message.includes("invalid token") || message.includes("otp")) return "验证链接已失效，请重新发送邮件。";
  if (message.includes("supabase") || message.includes("configuration")) return "账号服务暂时不可用，请检查项目配置。";
  if (message.includes("network") || message.includes("fetch")) return "网络连接异常，请稍后重试。";

  return "暂时无法完成操作，请稍后重试。";
}
