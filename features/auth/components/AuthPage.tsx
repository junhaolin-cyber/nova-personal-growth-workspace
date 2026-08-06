"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "../errors";
import type { AuthMode } from "../types";

type AuthPageProps = {
  initialMode: AuthMode;
  nextPath: string;
  initialError?: string;
};

function safeNextPath(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function errorFromCode(code?: string): string | null {
  if (code === "verification_expired") return "验证链接已失效，请重新发送验证邮件。";
  if (code === "callback_failed") return "验证链接暂时无法处理，请重新发送邮件。";
  return null;
}

export function AuthPage({ initialMode, nextPath, initialError }: AuthPageProps) {
  const router = useRouter();
  const [mode, setMode] = React.useState<AuthMode>(initialMode);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(errorFromCode(initialError));
  const [notice, setNotice] = React.useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = React.useState("");

  const safeNext = safeNextPath(nextPath);
  const createCallbackUrl = React.useCallback((target: string) => {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("next", target);
    return url.toString();
  }, []);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setNotice(null);

    if (!email.trim() && mode !== "reset") {
      setError("请输入邮箱地址。");
      return;
    }
    if ((mode === "login" || mode === "register" || mode === "reset") && password.length < 6) {
      setError("密码至少需要 6 位字符。");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }
    if (mode === "reset" && password !== confirmPassword) {
      setError("两次输入的新密码不一致。");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "login") {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
        router.replace(safeNext);
        router.refresh();
      } else if (mode === "register") {
        const result = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim() || undefined, language: "zh-CN", timezone: "Asia/Shanghai" },
            emailRedirectTo: createCallbackUrl("/auth?mode=verified"),
          },
        });
        if (result.error) throw result.error;
        if (result.data.session) {
          router.replace(safeNext);
          router.refresh();
        } else {
          setVerificationEmail(email.trim());
          setNotice("注册成功，请检查邮箱并点击验证链接。验证完成后会自动建立登录状态。");
        }
      } else if (mode === "forgot") {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: createCallbackUrl("/auth?mode=reset") });
        if (result.error) throw result.error;
        setNotice("如果该邮箱已注册，密码重置邮件会很快送达，请检查收件箱和垃圾邮件。");
      } else {
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        setNotice("密码已重置，请继续使用 NOVA。");
        window.setTimeout(() => {
          router.replace(safeNext);
          router.refresh();
        }, 600);
      }
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendVerification = async () => {
    if (!verificationEmail || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createSupabaseBrowserClient().auth.resend({ type: "signup", email: verificationEmail, options: { emailRedirectTo: createCallbackUrl("/auth?mode=verified") } });
      if (result.error) throw result.error;
      setNotice("验证邮件已重新发送，请稍候查收。");
    } catch (resendError) {
      setError(getAuthErrorMessage(resendError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPasswordMode = mode === "login" || mode === "register" || mode === "reset";
  const title = mode === "login" ? "欢迎回到 NOVA" : mode === "register" ? "创建你的 NOVA 账号" : mode === "forgot" ? "找回密码" : "设置新密码";
  const subtitle = mode === "login" ? "登录后继续使用你的个人工作台。" : mode === "register" ? "使用邮箱创建属于你的个人空间。" : mode === "forgot" ? "输入注册邮箱，我们会发送密码重置链接。" : "请设置一个新的登录密码。";

  return <main className="min-h-screen bg-canvas px-5 py-8 text-ink sm:px-8 sm:py-12">
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-[1080px] items-center justify-center">
      <section className="grid w-full overflow-hidden rounded-[32px] border border-line bg-white shadow-card lg:grid-cols-[.9fr_1.1fr]">
        <div className="hidden flex-col justify-between bg-[#DCDDED] p-10 lg:flex"><div><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-[13px] bg-ink text-white"><ShieldCheck size={20} /></span><span className="text-lg font-extrabold">NOVA</span></div><p className="mt-16 max-w-xs text-3xl font-extrabold leading-tight">让长期成长，<br />从一次安全登录开始。</p><p className="mt-5 max-w-xs text-sm leading-6 text-muted">你的账号只负责身份与设备信息，现有业务数据仍保留在本地。</p></div><p className="text-xs text-muted">个人成长工作台 · 账号基础设施</p></div>
        <div className="p-6 sm:p-10 lg:p-12">
          <div className="mb-8 flex items-center justify-between"><div><p className="text-sm font-bold text-accent">NOVA 账号</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">{title}</h1><p className="mt-2 text-sm text-muted">{subtitle}</p></div><span className="grid size-11 place-items-center rounded-2xl bg-[#F0F0FF] text-accent lg:hidden"><KeyRound size={19} /></span></div>
          {notice ? <div className="mb-5 flex items-start gap-2 rounded-2xl border border-[#CDE7D5] bg-[#F3FBF5] px-4 py-3 text-sm leading-6 text-[#43845D]"><CheckCircle2 className="mt-0.5 shrink-0" size={17} /><span>{notice}</span></div> : null}
          {error ? <div className="mb-5 flex items-start gap-2 rounded-2xl border border-[#F0D2BB] bg-[#FFF8F2] px-4 py-3 text-sm leading-6 text-[#9C5D32]"><AlertCircle className="mt-0.5 shrink-0" size={17} /><span>{error}</span></div> : null}
          {verificationEmail && notice ? <button type="button" onClick={() => void resendVerification()} disabled={isSubmitting} className="mb-5 text-sm font-bold text-accent disabled:opacity-50">{isSubmitting ? "正在发送…" : "重新发送验证邮件"}</button> : null}
          {!(verificationEmail && notice) ? <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            {mode === "register" ? <Field label="昵称（可选）" icon={<UserRound size={16} />}><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="form-input pl-10" placeholder="例如：Jie" maxLength={40} /></Field> : null}
            {mode !== "reset" ? <Field label="邮箱" icon={<Mail size={16} />}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="form-input pl-10" placeholder="you@example.com" autoComplete="email" required /></Field> : null}
            {isPasswordMode ? <PasswordField label={mode === "reset" ? "新密码" : "密码"} value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete={mode === "reset" ? "new-password" : mode === "register" ? "new-password" : "current-password"} /> : null}
            {(mode === "register" || mode === "reset") ? <PasswordField label="确认密码" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} autoComplete="new-password" /> : null}
            <button type="submit" disabled={isSubmitting} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}{isSubmitting ? "处理中…" : mode === "login" ? "登录" : mode === "register" ? "注册并验证邮箱" : mode === "forgot" ? "发送重置邮件" : "保存新密码"}</button>
          </form> : null}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted">{mode !== "login" && mode !== "reset" ? <button type="button" onClick={() => changeMode("login")} className="font-semibold hover:text-accent">返回登录</button> : null}{mode === "login" ? <><button type="button" onClick={() => changeMode("register")} className="font-semibold hover:text-accent">创建账号</button><button type="button" onClick={() => changeMode("forgot")} className="font-semibold hover:text-accent">忘记密码</button></> : null}{mode === "reset" ? <button type="button" onClick={() => changeMode("login")} className="inline-flex items-center gap-1 font-semibold hover:text-accent"><ArrowLeft size={14} />返回登录</button> : null}</div>
        </div>
      </section>
    </div>
  </main>;
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-muted"><span className="mb-2 block">{label}</span><span className="relative block"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A6AE]">{icon}</span>{children}</span></label>;
}

function PasswordField({ label, value, onChange, visible, onToggle, autoComplete }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void; autoComplete: string }) {
  return <Field label={label} icon={<LockKeyhole size={16} />}><input type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} className="form-input px-10" placeholder="至少 6 位字符" autoComplete={autoComplete} required /><button type="button" onClick={onToggle} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-accent" aria-label={visible ? "隐藏密码" : "显示密码"}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></Field>;
}
