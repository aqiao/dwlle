import { Icon } from './Icon'

interface LoginPageProps {
  error: string
  onLogin: () => void
}

export function LoginPage({ error, onLogin }: LoginPageProps) {
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="enterprise-logo">DW</div>
        <div className="login-icon"><Icon name="shield" size={28} /></div>
        <h1 id="login-title">登录数据治理平台</h1>
        <p>使用企业统一身份认证进入你的工作空间。</p>
        <button className="button button-primary login-button" onClick={onLogin}>
          通过 OIDC 登录
        </button>
        {error && <div className="login-error" role="alert">{error}</div>}
        <span className="login-security"><Icon name="check" size={14} />Authorization Code + PKCE</span>
      </section>
    </main>
  )
}
