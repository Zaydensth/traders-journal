import { useState } from 'react';
import {
  User, Lock, Shield, Bell, Download, Upload,
  Trash2, Save, ChevronDown, CreditCard, Check,
  Settings2, AlertTriangle, Scale, Moon
} from 'lucide-react';
import { toggleTheme, getTheme } from '../utils/theme';

interface SettingsState {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  twoFactor: boolean;
  riskPerTrade: string;
  defaultSetup: string;
  aiInsights: boolean;
  perfEmails: boolean;
  dailyReminders: boolean;
  mistakeReminders: boolean;
  productUpdates: boolean;
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsState>({
    fullName: 'Demo Trader',
    email: 'demotrader@email.com',
    phoneNumber: '+91 98765 43210',
    password: '••••••••••',
    twoFactor: true,
    riskPerTrade: '1',
    defaultSetup: 'EMA + VWAP',
    aiInsights: true,
    perfEmails: true,
    dailyReminders: true,
    mistakeReminders: false,
    productUpdates: true,
  });

  const [savedSection, setSavedSection] = useState('');
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');

  function updateField<K extends keyof SettingsState>(field: K, value: SettingsState[K]) {
    setSettings(prev => ({ ...prev, [field]: value }));
  }

  function handleSave(section: string) {
    localStorage.setItem('tj_settings', JSON.stringify(settings));
    setSavedSection(section);
    setTimeout(() => setSavedSection(''), 2000);
  }

  function handleResetDiscipline() {
    if (window.confirm('Are you sure you want to reset your Discipline Score to zero?')) {
      alert('Discipline Score has been reset.');
    }
  }

  function handleExport() {
    const trades = localStorage.getItem('tj_trades') || '[]';
    const blob = new Blob([trades], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Settings</h2>
          <p>Reflect on today's trading to improve tomorrow.</p>
        </div>
      </div>

      <div className="settings-layout">

        {/* ===== SECTION 1: ACCOUNT SETTINGS ===== */}
        <div className="card form-section animate-in">
          <div className="form-section-header">
            <User size={18} color="var(--green-600)" />
            <h3>Account Settings</h3>
          </div>

          <div className="settings-profile">
            <div className="user-avatar" style={{ width: 56, height: 56, fontSize: '1.3rem' }}>
              {settings.fullName.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="settings-profile-info">
              <strong>{settings.fullName}</strong>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={e => updateField('email', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={settings.phoneNumber}
                onChange={e => updateField('phoneNumber', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label><Lock size={13} /> Password</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="password"
                value={settings.password}
                readOnly
                style={{ flex: 1 }}
              />
              <button className="btn-outline-green">Change Password</button>
            </div>
          </div>

          <div className="settings-toggle-row" style={{ padding: '12px 0', borderBottom: 'none' }}>
            <div className="settings-toggle-info">
              <Shield size={18} />
              <div>
                <strong>Two-Factor Authentication</strong>
                <span style={{ color: 'var(--green-600)', fontWeight: 500, cursor: 'pointer' }}>Manage</span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.twoFactor}
                onChange={e => updateField('twoFactor', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button className="btn-primary-outlined" onClick={() => handleSave('account')}>
              {savedSection === 'account' ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        </div>

        {/* ===== SECTION 2: TRADING + NOTIFICATION SIDE BY SIDE ===== */}
        <div className="settings-row-2">
          {/* Trading Preferences */}
          <div className="card form-section animate-in">
            <div className="form-section-header">
              <Settings2 size={18} color="var(--green-600)" />
              <h3>Trading Preferences</h3>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Default Risk per Trade (%)</label>
              <div className="select-wrapper">
                <select value={settings.riskPerTrade} onChange={e => updateField('riskPerTrade', e.target.value)}>
                  <option value="0.5">0.5</option>
                  <option value="1">1</option>
                  <option value="1.5">1.5</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="5">5</option>
                </select>
                <ChevronDown size={14} className="select-icon" />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Default Chart Setup</label>
              <div className="select-wrapper">
                <select value={settings.defaultSetup} onChange={e => updateField('defaultSetup', e.target.value)}>
                  <option>EMA + VWAP</option>
                  <option>Breakout</option>
                  <option>Reversal</option>
                  <option>Trend Following</option>
                  <option>Scalp</option>
                  <option>Gap Fill</option>
                </select>
                <ChevronDown size={14} className="select-icon" />
              </div>
            </div>

            <div className="settings-toggle-row" style={{ padding: '8px 0' }}>
              <div className="settings-toggle-info">
                <div>
                  <strong>Enable AI Insights</strong>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.aiInsights}
                  onChange={e => updateField('aiInsights', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-toggle-row" style={{ borderBottom: 'none', padding: '8px 0' }}>
              <div className="settings-toggle-info">
                <Moon size={18} />
                <div>
                  <strong>Dark Mode</strong>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={isDark}
                  onChange={() => { const next = toggleTheme(); setIsDark(next === 'dark'); }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button className="btn-primary-outlined" onClick={() => handleSave('trading')}>
                {savedSection === 'trading' ? <><Check size={16} /> Saved!</> : <>Save Trading Preferences</>}
              </button>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="card form-section animate-in">
            <div className="form-section-header">
              <Bell size={18} color="var(--green-600)" />
              <h3>Notification Preferences</h3>
            </div>

            <div className="settings-toggles">
              <div className="settings-toggle-row">
                <div className="settings-toggle-info">
                  <div className="notif-check active">
                    <Check size={12} />
                  </div>
                  <div>
                    <strong>Performance Summary Emails</strong>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.perfEmails}
                    onChange={e => updateField('perfEmails', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-toggle-row">
                <div className="settings-toggle-info">
                  <div className="notif-check active">
                    <Check size={12} />
                  </div>
                  <div>
                    <strong>Daily Review Reminders</strong>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.dailyReminders}
                    onChange={e => updateField('dailyReminders', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-toggle-row">
                <div className="settings-toggle-info">
                  <div className={`notif-check ${settings.mistakeReminders ? 'active' : ''}`}>
                    {settings.mistakeReminders && <Check size={12} />}
                  </div>
                  <div>
                    <strong>Mistake Reminders</strong>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.mistakeReminders}
                    onChange={e => updateField('mistakeReminders', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-toggle-row">
                <div className="settings-toggle-info">
                  <div className="notif-check active">
                    <Check size={12} />
                  </div>
                  <div>
                    <strong>Product Updates & Tips</strong>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.productUpdates}
                    onChange={e => updateField('productUpdates', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button className="btn-primary-outlined" onClick={() => handleSave('notif')}>
                {savedSection === 'notif' ? <><Check size={16} /> Saved!</> : <>Save Notification Preferences</>}
              </button>
            </div>
          </div>
        </div>

        {/* ===== SECTION 3: MISTAKE MANAGEMENT ===== */}
        <div className="card form-section animate-in">
          <div className="form-section-header">
            <AlertTriangle size={18} color="var(--green-600)" />
            <h3>Mistake Management</h3>
          </div>
          <div className="settings-row-2">
            <div className="mistake-mgmt-card" onClick={() => alert('Mistake categories can be customized in a future update.')}>
              <strong>Manage Mistake Categories</strong>
              <span>Customize or add new trading mistakes</span>
            </div>
            <div className="mistake-mgmt-card" onClick={handleResetDiscipline}>
              <strong>Reset Discipline Score</strong>
              <span>Reset your discipline score to zero</span>
            </div>
          </div>
        </div>

        {/* ===== SECTION 4: SUBSCRIPTION ===== */}
        <div className="card form-section animate-in">
          <div className="form-section-header">
            <CreditCard size={18} color="var(--green-600)" />
            <h3>Subscription</h3>
          </div>

          <div className="subscription-header">
            <div className="subscription-icon">
              <Scale size={24} />
            </div>
            <div className="subscription-info">
              <div className="subscription-plan">
                <strong>Pro Plan</strong>
                <span>Renews on Dec 1, 2024 · ₹999/month</span>
              </div>
              <div className="subscription-actions">
                <button className="btn-outline-green">Update Plan</button>
                <button className="btn-text">Cancel</button>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
            14-day free trial: Your next renewal date is : <strong>Dec 1, 2024</strong> · Your Pro Plan benefits include:
          </p>

          <div className="subscription-features">
            <div className="sub-feature"><Check size={14} color="var(--green-600)" /> Unlimited trades</div>
            <div className="sub-feature"><Check size={14} color="var(--green-600)" /> Advanced analytics</div>
            <div className="sub-feature"><Check size={14} color="var(--green-600)" /> Mistake heatmaps & AI Insights</div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button className="btn-primary-outlined">
              <CreditCard size={16} /> Manage Payment Method
            </button>
          </div>
        </div>

        {/* ===== SECTION 5: DATA MANAGEMENT ===== */}
        <div className="card form-section animate-in">
          <div className="form-section-header">
            <Download size={18} color="var(--green-600)" />
            <h3>Data Management</h3>
          </div>
          <div className="data-actions">
            <div className="data-action-card" onClick={handleExport}>
              <div className="data-action-icon green"><Download size={22} /></div>
              <div>
                <strong>Export Trades</strong>
                <span>Download all your trades as JSON</span>
              </div>
            </div>
            <div className="data-action-card" onClick={() => alert('Import feature coming soon!')}>
              <div className="data-action-icon blue"><Upload size={22} /></div>
              <div>
                <strong>Import Trades</strong>
                <span>Import trades from a JSON file</span>
              </div>
            </div>
            <div className="data-action-card danger" onClick={() => { if(window.confirm('Delete ALL trade data?')) { localStorage.removeItem('tj_trades'); alert('Deleted.'); }}}>
              <div className="data-action-icon red"><Trash2 size={22} /></div>
              <div>
                <strong>Delete All Data</strong>
                <span>Permanently remove all data</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="settings-footer">
          <div className="settings-footer-links">
            <a href="#">Help Center</a>
            <a href="#">Contact Support</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
          <p>© 2024 Trader's Journal. All rights reserved.</p>
        </div>
      </div>
    </>
  );
}
