import { useState } from 'react';
import {
  User, Mail, Globe, Bell, Moon, Sun, Download, Upload,
  Trash2, Shield, Save, ChevronDown, DollarSign, Clock,
  CreditCard, Check
} from 'lucide-react';

interface SettingsState {
  fullName: string;
  email: string;
  currency: string;
  timezone: string;
  defaultAsset: string;
  darkMode: boolean;
  notifications: boolean;
  emailAlerts: boolean;
  tradeReminders: boolean;
  weeklyReport: boolean;
  riskPerTrade: string;
  defaultStopLoss: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsState>({
    fullName: 'Demo Trader',
    email: 'demo@tradersjournal.com',
    currency: 'INR (₹)',
    timezone: '(UTC+05:30) Asia/Kolkata',
    defaultAsset: 'Stocks',
    darkMode: false,
    notifications: true,
    emailAlerts: false,
    tradeReminders: true,
    weeklyReport: true,
    riskPerTrade: '2',
    defaultStopLoss: '1.5',
  });

  const [saved, setSaved] = useState(false);

  function updateField<K extends keyof SettingsState>(field: K, value: SettingsState[K]) {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function handleSave() {
    localStorage.setItem('tj_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (Array.isArray(data)) {
            localStorage.setItem('tj_trades', JSON.stringify(data));
            alert(`Successfully imported ${data.length} trades!`);
          }
        } catch {
          alert('Invalid file format. Please use a valid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleDeleteAll() {
    if (window.confirm('⚠️ Are you sure you want to delete ALL trade data? This action cannot be undone.')) {
      localStorage.removeItem('tj_trades');
      alert('All trade data has been deleted.');
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Settings</h2>
          <p>Manage your account, preferences, and trading defaults.</p>
        </div>
        <div className="page-header-right">
          <button className="btn-primary" onClick={handleSave} style={{ padding: '8px 20px' }}>
            {saved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
          </button>
        </div>
      </div>

      <div className="settings-layout">
        {/* Section 1: Account */}
        <div className="card form-section animate-in">
          <div className="form-section-header">
            <User size={18} color="var(--green-600)" />
            <h3>Account Settings</h3>
          </div>

          <div className="settings-profile">
            <div className="settings-avatar">
              <div className="user-avatar" style={{ width: 64, height: 64, fontSize: '1.4rem' }}>DT</div>
            </div>
            <div className="settings-profile-info">
              <strong>Demo Trader</strong>
              <span>Free Plan</span>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={settings.fullName}
                onChange={e => updateField('fullName', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label><Mail size={13} /> Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={e => updateField('email', e.target.value)}
              />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label><DollarSign size={13} /> Default Currency</label>
              <div className="select-wrapper">
                <select value={settings.currency} onChange={e => updateField('currency', e.target.value)}>
                  <option>INR (₹)</option>
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                  <option>GBP (£)</option>
                </select>
                <ChevronDown size={14} className="select-icon" />
              </div>
            </div>
            <div className="form-group">
              <label><Globe size={13} /> Timezone</label>
              <div className="select-wrapper">
                <select value={settings.timezone} onChange={e => updateField('timezone', e.target.value)}>
                  <option>(UTC+05:30) Asia/Kolkata</option>
                  <option>(UTC+00:00) UTC</option>
                  <option>(UTC-05:00) Eastern Time</option>
                  <option>(UTC-08:00) Pacific Time</option>
                  <option>(UTC+08:00) Asia/Singapore</option>
                  <option>(UTC+09:00) Asia/Tokyo</option>
                </select>
                <ChevronDown size={14} className="select-icon" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Trading Preferences */}
        <div className="card form-section animate-in">
          <div className="form-section-header">
            <CreditCard size={18} color="var(--green-600)" />
            <h3>Trading Preferences</h3>
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Default Asset Type</label>
              <div className="select-wrapper">
                <select value={settings.defaultAsset} onChange={e => updateField('defaultAsset', e.target.value)}>
                  <option>Stocks</option>
                  <option>Forex</option>
                  <option>Crypto</option>
                  <option>Index</option>
                  <option>Options</option>
                </select>
                <ChevronDown size={14} className="select-icon" />
              </div>
            </div>
            <div className="form-group">
              <label>Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.5"
                value={settings.riskPerTrade}
                onChange={e => updateField('riskPerTrade', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Default Stop Loss (%)</label>
              <input
                type="number"
                step="0.5"
                value={settings.defaultStopLoss}
                onChange={e => updateField('defaultStopLoss', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Display & Notifications */}
        <div className="card form-section animate-in">
          <div className="form-section-header">
            <Bell size={18} color="var(--green-600)" />
            <h3>Display & Notifications</h3>
          </div>

          <div className="settings-toggles">
            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                {settings.darkMode ? <Moon size={18} /> : <Sun size={18} />}
                <div>
                  <strong>Dark Mode</strong>
                  <span>Switch between light and dark theme</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={e => updateField('darkMode', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                <Bell size={18} />
                <div>
                  <strong>Push Notifications</strong>
                  <span>Get notified about important events</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={e => updateField('notifications', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                <Mail size={18} />
                <div>
                  <strong>Email Alerts</strong>
                  <span>Receive trade summaries via email</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.emailAlerts}
                  onChange={e => updateField('emailAlerts', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                <Clock size={18} />
                <div>
                  <strong>Trade Reminders</strong>
                  <span>Daily reminders to log your trades</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.tradeReminders}
                  onChange={e => updateField('tradeReminders', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                <Shield size={18} />
                <div>
                  <strong>Weekly Performance Report</strong>
                  <span>Automated weekly trading performance summary</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.weeklyReport}
                  onChange={e => updateField('weeklyReport', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Data Management */}
        <div className="card form-section animate-in">
          <div className="form-section-header">
            <Download size={18} color="var(--green-600)" />
            <h3>Data Management</h3>
          </div>
          <div className="data-actions">
            <div className="data-action-card" onClick={handleExport}>
              <div className="data-action-icon green">
                <Download size={22} />
              </div>
              <div>
                <strong>Export Trades</strong>
                <span>Download all your trades as JSON</span>
              </div>
            </div>
            <div className="data-action-card" onClick={handleImport}>
              <div className="data-action-icon blue">
                <Upload size={22} />
              </div>
              <div>
                <strong>Import Trades</strong>
                <span>Import trades from a JSON file</span>
              </div>
            </div>
            <div className="data-action-card danger" onClick={handleDeleteAll}>
              <div className="data-action-icon red">
                <Trash2 size={22} />
              </div>
              <div>
                <strong>Delete All Data</strong>
                <span>Permanently remove all trade data</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: App Info */}
        <div className="card form-section animate-in">
          <div className="form-section-header">
            <Shield size={18} color="var(--green-600)" />
            <h3>Application</h3>
          </div>
          <div className="app-info-grid">
            <div className="app-info-item">
              <span>Version</span>
              <strong>1.0.0</strong>
            </div>
            <div className="app-info-item">
              <span>Data Storage</span>
              <strong>Local (Browser)</strong>
            </div>
            <div className="app-info-item">
              <span>Last Sync</span>
              <strong>{new Date().toLocaleDateString()}</strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
