import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { api, type ApiError } from './api';
import { Icon, type IconName } from './ui/Icon';
import { CrystalBackdrop, LogoLockup } from './ui/art';
import type { Bootstrap, Me } from './ui/types';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { QueuePage, MusicPage } from './pages/MusicPages';
import { SystemPage, ConnectionsPage, UsageStatsPage, DeveloperPage } from './pages/SystemPages';
import { EmbedsPage, LinksPage, WebhooksPage } from './pages/IntegrationsPages';
import { UsersPage, CredentialsPage, LogsPage, SecurityPage, BackupPage, SettingsPage, BotSettingsPage, ProfilePage } from './pages/AdminPages';

interface Ctx {
  me: Me;
  boot: Bootstrap;
  refreshMe: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
}
const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => useContext(AppCtx)!;

interface NavDef {
  to: string;
  icon: IconName;
  label: string;
  chev?: boolean;
}

const NAV: NavDef[] = [
  { to: '/', icon: 'home', label: 'หน้าแรก' },
  { to: '/queue', icon: 'queue', label: 'คิวเพลง', chev: true },
  { to: '/music', icon: 'music', label: 'เพลง' },
  { to: '/system', icon: 'monitor', label: 'ซิสเทม' },
  { to: '/embeds', icon: 'embed', label: 'จัดการ Embed' },
  { to: '/links', icon: 'link', label: 'ลิงก์ & เชื่อม' },
  { to: '/users', icon: 'users', label: 'ยูสเซอร์' },
  { to: '/usage', icon: 'chart', label: 'สถิติการใช้งาน' },
  { to: '/bot-settings', icon: 'bot', label: 'ตั้งค่าบอท' },
  { to: '/credentials', icon: 'key', label: 'API & Credentials' },
  { to: '/connections', icon: 'plug', label: 'การเชื่อมต่อ' },
  { to: '/webhooks', icon: 'webhook', label: 'Webhook' },
  { to: '/profile', icon: 'idcard', label: 'ข้อมูลผู้ใช้' },
  { to: '/logs', icon: 'log', label: 'บันทึกการทำงาน' },
  { to: '/security', icon: 'shield', label: 'ความปลอดภัย' },
  { to: '/backup', icon: 'backup', label: 'การสำรองข้อมูล' },
  { to: '/settings', icon: 'gear', label: 'ระบบ' },
  { to: '/account', icon: 'badge', label: 'บัญชี' },
  { to: '/developer', icon: 'code', label: 'ผู้พัฒนา' },
];

function Sidebar({ me, open }: { me: Me; open: boolean }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} id="sidebar">
      <div className="logo-area">
        <LogoLockup />
      </div>
      <nav className="nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Icon name={n.icon} />
            <span>{n.label}</span>
            {n.chev && <Icon name="chevron-right" size={12} className="chev" />}
          </NavLink>
        ))}
      </nav>
      <NavLink to="/profile" className="usercard" style={{ textDecoration: 'none', color: 'inherit' }}>
        {me.user?.avatarUrl ? (
          <img className="avatar" src={me.user.avatarUrl} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="avatar-fallback">{me.user?.login?.slice(0, 1).toUpperCase() ?? '?'}</span>
        )}
        <span className="uinfo">
          <span className="uname">{me.user?.login ?? '—'}</span>
          {me.user && (me.user.role === 'owner' ? <span className="badge-owner">Owner</span> : <span className="badge-role">{me.user.role}</span>)}
        </span>
        <Icon name="chevron-right" size={13} className="chev" />
      </NavLink>
      <div className="quickrow">
        <NavLink to="/" title="หน้าแรก">
          <Icon name="home" size={15} />
        </NavLink>
        <a href="https://github.com" target="_blank" rel="noreferrer" title="GitHub">
          <Icon name="github" size={15} />
        </a>
        <NavLink to="/backup" title="การสำรองข้อมูล">
          <Icon name="download" size={15} />
        </NavLink>
        <NavLink to="/connections" title="การเชื่อมต่อ">
          <Icon name="headset" size={15} />
        </NavLink>
      </div>
    </aside>
  );
}

function Header({
  me,
  onMenu,
  search,
  setSearch,
}: {
  me: Me;
  onMenu: () => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const loc = useLocation();
  return (
    <header className="header">
      <button className="hamburger" onClick={onMenu} aria-label="menu">
        <Icon name="menu" size={17} />
      </button>
      <span className="side-logo">
        NABEE <span style={{ color: 'var(--cyan-2)' }}>HEX</span> TEAM
      </span>
      <label className="search">
        <Icon name="search" size={14} />
        <input placeholder="ค้นหาเพลง, เซิร์ฟเวอร์ หรือคำสั่ง..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      <span className="spacer" />
      <a className="iconbtn" href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub">
        <Icon name="github" size={17} />
      </a>
      <button
        className="iconbtn"
        aria-label="notifications"
        onClick={() => {
          const p = loc.pathname === '/' ? '/usage' : '/';
          window.location.hash = `#${p}`;
        }}
      >
        <Icon name="bell" size={16} />
        <i className="ndot" />
      </button>
      <NavLink to="/profile" className="userchip" style={{ textDecoration: 'none', color: 'inherit' }}>
        {me.user?.avatarUrl ? (
          <img className="avatar" src={me.user.avatarUrl} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="avatar-fallback">{me.user?.login?.slice(0, 1).toUpperCase() ?? '?'}</span>
        )}
        <span className="cu">
          <span className="uname">{me.user?.login ?? '—'}</span>
          {me.user && (me.user.role === 'owner' ? <span className="badge-owner">Owner</span> : <span className="badge-role">{me.user.role}</span>)}
        </span>
        <Icon name="chevron-down" size={13} className="chev" />
      </NavLink>
    </header>
  );
}

function TabBar() {
  const tabs: { to: string; icon: IconName; label: string }[] = [
    { to: '/', icon: 'home', label: 'หน้าแรก' },
    { to: '/queue', icon: 'queue', label: 'คิวเพลง' },
    { to: '/system', icon: 'monitor', label: 'ซิสเทม' },
    { to: '/more', icon: 'list', label: 'อื่น ๆ' },
  ];
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive && t.to !== '/more' ? 'active' : t.to === '/more' ? '' : '')}>
          <Icon name={t.icon} size={17} />
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Shell({ me, boot, children }: { me: Me; boot: Bootstrap; children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const loc = useLocation();
  useEffect(() => setDrawerOpen(false), [loc.pathname]);
  const ctx = useMemo<Ctx>(() => ({ me, boot, refreshMe: () => window.location.reload(), drawerOpen, setDrawerOpen }), [me, boot, drawerOpen]);
  return (
    <AppCtx.Provider value={ctx}>
      <div className="shell">
        <CrystalBackdrop />
        <div className="frame">
          <Sidebar me={me} open={drawerOpen} />
          {drawerOpen && (
            <div className="drawer-backdrop show" onClick={() => setDrawerOpen(false)} />
          )}
          <div className="frame-inner">
            <Header me={me} onMenu={() => setDrawerOpen(!drawerOpen)} search={search} setSearch={setSearch} />
            <main className="content">{children}</main>
            <footer className="frame-foot">
              <span className="brand">NABEE HEX TEAM</span>
              <span className="divider" />
              <span>Discord Music Bot • Web Control Panel</span>
              <span className="right">
                BIGGER&nbsp;&nbsp;STRONGER&nbsp;&nbsp;TOGETHER
                <Icon name="crown" size={14} />
              </span>
            </footer>
          </div>
          <TabBar />
        </div>
      </div>
    </AppCtx.Provider>
  );
}

function Forbidden() {
  return (
    <div className="page-body" style={{ alignItems: 'center' }}>
      <div className="errbox" style={{ maxWidth: 420, textAlign: 'center' }}>
        <Icon name="lock" size={20} />
        <div style={{ marginTop: 6 }}>หน้านี้สำหรับ Owner เท่านั้น — สิทธิ์ทั้งหมดถูกตรวจสอบฝั่ง Server</div>
      </div>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    Promise.all([api<Me>('/api/me'), api<Bootstrap>('/api/bootstrap')])
      .then(([m, b]) => {
        setMe(m);
        setBoot(b);
      })
      .catch((e: ApiError) => setErr(e.message));
  };
  useEffect(load, []);

  if (err) {
    return (
      <div className="login-wrap">
        <CrystalBackdrop />
        <div className="login-card">
          <div className="errbox">{err}</div>
        </div>
      </div>
    );
  }
  if (!me || !boot) {
    return (
      <div className="login-wrap">
        <CrystalBackdrop />
        <div className="login-card">กำลังโหลด…</div>
      </div>
    );
  }
  if (!me.authenticated) {
    return (
      <>
        <CrystalBackdrop />
        <Login me={me} boot={boot} />
      </>
    );
  }

  const isStaff = me.user!.role === 'owner' || me.user!.role === 'admin';
  const OwnerOnly = ({ children }: { children: React.ReactNode }) => (me.user!.role === 'owner' ? <>{children}</> : <Forbidden />);
  const StaffOnly = ({ children }: { children: React.ReactNode }) => (isStaff ? <>{children}</> : <Forbidden />);

  return (
    <HashRouter>
      <Routes>
        <Route
          path="*"
          element={
            <Shell me={me} boot={boot}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/queue" element={<QueuePage />} />
                <Route path="/music" element={<MusicPage />} />
                <Route path="/system" element={<SystemPage />} />
                <Route
                  path="/embeds"
                  element={
                    <StaffOnly>
                      <EmbedsPage />
                    </StaffOnly>
                  }
                />
                <Route path="/links" element={<LinksPage />} />
                <Route
                  path="/users"
                  element={
                    <OwnerOnly>
                      <UsersPage />
                    </OwnerOnly>
                  }
                />
                <Route path="/usage" element={<UsageStatsPage />} />
                <Route
                  path="/bot-settings"
                  element={
                    <OwnerOnly>
                      <BotSettingsPage />
                    </OwnerOnly>
                  }
                />
                <Route
                  path="/credentials"
                  element={
                    <OwnerOnly>
                      <CredentialsPage />
                    </OwnerOnly>
                  }
                />
                <Route path="/connections" element={<ConnectionsPage />} />
                <Route
                  path="/webhooks"
                  element={
                    <OwnerOnly>
                      <WebhooksPage />
                    </OwnerOnly>
                  }
                />
                <Route path="/profile" element={<ProfilePage />} />
                <Route
                  path="/logs"
                  element={
                    <OwnerOnly>
                      <LogsPage />
                    </OwnerOnly>
                  }
                />
                <Route
                  path="/security"
                  element={
                    <OwnerOnly>
                      <SecurityPage />
                    </OwnerOnly>
                  }
                />
                <Route
                  path="/backup"
                  element={
                    <OwnerOnly>
                      <BackupPage />
                    </OwnerOnly>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <OwnerOnly>
                      <SettingsPage />
                    </OwnerOnly>
                  }
                />
                <Route path="/account" element={<ProfilePage />} />
                <Route path="/developer" element={<DeveloperPage />} />
                <Route path="/more" element={<Navigate to="/system" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Shell>
          }
        />
      </Routes>
    </HashRouter>
  );
}
