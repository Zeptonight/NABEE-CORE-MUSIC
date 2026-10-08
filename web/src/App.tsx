import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { api, type ApiError } from './api';
import { Icon, type IconName } from './ui/Icon';
import { CrystalBackdrop, HorizontalLogo } from './ui/art';
import type { Bootstrap, DashboardData, Me } from './ui/types';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { QueuePage, MusicPage } from './pages/MusicPages';
import { SystemPage, ConnectionsPage, UsageStatsPage, DeveloperPage, DatabasePage, HelpPage, ApiDocsPage } from './pages/SystemPages';
import { EmbedsPage, LinksPage, WebhooksPage, CommunityPage, ServersPage } from './pages/IntegrationsPages';
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
}

const NAV: NavDef[] = [
  { to: '/', icon: 'home', label: 'หน้าแรก' },
  { to: '/community', icon: 'music', label: 'คอมมูนิตี้' },
  { to: '/music', icon: 'disc', label: 'เพลง' },
  { to: '/servers', icon: 'server', label: 'เซิร์ฟเวอร์' },
  { to: '/embeds', icon: 'embed', label: 'จัดการ Embed' },
  { to: '/links', icon: 'link', label: 'ลิงค์ & เชื่อม' },
  { to: '/users', icon: 'users', label: 'ยูสเซอร์' },
  { to: '/usage', icon: 'chart', label: 'สถิติการใช้งาน' },
  { to: '/bot-settings', icon: 'gear', label: 'ตั้งค่า Bot' },
  { to: '/credentials', icon: 'key', label: 'API & Credentials' },
  { to: '/connections', icon: 'plug', label: 'การเชื่อมต่อ' },
  { to: '/webhooks', icon: 'webhook', label: 'Webhook' },
  { to: '/database', icon: 'backup', label: 'ฐานข้อมูล' },
  { to: '/security', icon: 'shield', label: 'ความปลอดภัย' },
  { to: '/backup', icon: 'download', label: 'สำรองข้อมูล' },
  { to: '/system', icon: 'monitor', label: 'ระบบ' },
  { to: '/settings', icon: 'gear', label: 'ตั้งค่า' },
  { to: '/help', icon: 'help', label: 'ช่วยเหลือ' },
];

function Sidebar({ me, open, onToggle }: { me: Me; open: boolean; onToggle: () => void }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} id="sidebar">
      <div className="side-head">
        <button className="hamburger side-toggle" onClick={onToggle} aria-label="toggle menu">
          <Icon name="menu" size={16} />
        </button>
        <HorizontalLogo />
      </div>
      <nav className="nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Icon name={n.icon} />
            <span>{n.label}</span>
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
        <a href="https://discord.com/developers/docs" target="_blank" rel="noreferrer" title="Discord">
          <Icon name="discord" size={15} />
        </a>
        <NavLink to="/backup" title="สำรองข้อมูล">
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
  onToggle,
  unread,
  search,
  setSearch,
}: {
  me: Me;
  onToggle: () => void;
  unread: number;
  search: string;
  setSearch: (v: string) => void;
}) {
  const loc = useLocation();
  return (
    <header className="header">
      <button className="hamburger" onClick={onToggle} aria-label="menu">
        <Icon name="menu" size={17} />
      </button>
      <label className="search">
        <Icon name="search" size={14} />
        <input placeholder="ค้นหาเพลง, เซิร์ฟเวอร์ หรือคำสั่ง..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      <span className="spacer" />
      <a className="iconbtn" href="https://discord.com/developers/docs" target="_blank" rel="noreferrer" aria-label="Discord">
        <Icon name="discord" size={17} />
      </a>
      <button
        className="iconbtn"
        aria-label="notifications"
        title="กิจกรรมล่าสุด"
        onClick={() => {
          window.location.hash = loc.pathname === '/usage' ? '#/' : '#/usage';
        }}
      >
        <Icon name="bell" size={16} />
        {unread > 0 && <i className="nbadge">{unread > 9 ? '9+' : unread}</i>}
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
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive && t.to !== '/more' ? 'active' : '')}>
          <Icon name={t.icon} size={17} />
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Shell({ me, boot, children }: { me: Me; boot: Bootstrap; children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [unread, setUnread] = useState(0);
  const loc = useLocation();
  useEffect(() => setDrawerOpen(false), [loc.pathname]);
  useEffect(() => {
    api<Pick<DashboardData, 'unread'>>('/api/dashboard')
      .then((d) => setUnread(Number(d.unread ?? 0)))
      .catch(() => undefined);
  }, [loc.pathname]);

  const toggle = () => {
    if (window.matchMedia('(max-width: 1150px)').matches) setDrawerOpen(!drawerOpen);
    else setCollapsed(!collapsed);
  };

  const ctx = useMemo<Ctx>(() => ({ me, boot, refreshMe: () => window.location.reload(), drawerOpen, setDrawerOpen }), [me, boot, drawerOpen]);
  return (
    <AppCtx.Provider value={ctx}>
      <div className="shell">
        <CrystalBackdrop />
        <div className={`frame ${collapsed ? 'collapsed' : ''}`}>
          <Sidebar me={me} open={drawerOpen} onToggle={toggle} />
          {drawerOpen && <div className="drawer-backdrop show" onClick={() => setDrawerOpen(false)} />}
          <div className="frame-inner">
            <Header me={me} onToggle={toggle} unread={unread} search={search} setSearch={setSearch} />
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
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/servers" element={<ServersPage />} />
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
                <Route
                  path="/database"
                  element={
                    <StaffOnly>
                      <DatabasePage />
                    </StaffOnly>
                  }
                />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/api-docs" element={<ApiDocsPage />} />
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
