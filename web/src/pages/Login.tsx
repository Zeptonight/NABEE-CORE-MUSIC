import { Icon } from '../ui/Icon';
import { LogoLockup } from '../ui/art';
import type { Bootstrap, Me } from '../ui/types';

export function Login({ me, boot }: { me: Me; boot: Bootstrap }) {
  const ghReady = boot.github.configured && boot.github.baseUrlSet;
  return (
    <div className="login-wrap">
      <div className="login-card">
        <LogoLockup mascot={92} />
        <div className="lt">Web Control Panel</div>
        <div className="ls">
          NABEE CORE — Discord Music Bot Control Platform
          <br />
          เข้าสู่ระบบด้วย GitHub เท่านั้น (ไม่มีการลงทะเบียนสาธารณะ)
          <br />
          สิทธิ์ Owner ตรวจสอบจาก GitHub User ID จริง
        </div>
        {ghReady ? (
          <a className="login-github" href="/api/auth/github/start">
            <Icon name="github" size={18} />
            เข้าสู่ระบบด้วย GitHub
          </a>
        ) : (
          <div className="warnbox" style={{ width: '100%' }}>
            <strong>ยังไม่ได้ตั้งค่า GitHub OAuth</strong>
            <br />
            {boot.github.baseUrlSet
              ? 'ตั้งค่า GITHUB_CLIENT_ID และ GITHUB_CLIENT_SECRET ใน environment แล้วรีสตาร์ทเซิร์ฟเวอร์'
              : 'ตั้งค่า BASE_URL รวมถึง GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET ก่อนใช้งานระบบล็อกอิน'}
            {!boot.github.ownerConfigured && (
              <>
                <br />
                และกำหนด GITHUB_OWNER_ID (GitHub numeric user id) เพื่อให้สิทธิ์ Owner
              </>
            )}
          </div>
        )}
        <div className="note">
          ความปลอดภัย: OAuth state validation • Session httpOnly cookie • CSRF double-submit • ตรวจสิทธิ์ทุกคำขอฝั่ง server
        </div>
      </div>
    </div>
  );
}
