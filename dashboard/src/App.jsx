import React, { useState, useEffect } from 'react';

function App() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [seeding, setSeeding] = useState(false);

  // Fetch emails from the FastAPI backend
  const fetchEmails = () => {
    return fetch('http://127.0.0.1:8000/emails')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch emails: Server responded with status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setEmails(data);
        setError(null);
      })
      .catch((err) => {
        console.error('[Dashboard Error]', err);
        setError(err.message);
      });
  };

  useEffect(() => {
    setLoading(true);
    fetchEmails().finally(() => setLoading(false));
  }, []);

  // Post to backend to seed mock data, then refresh UI
  const handleSeedData = () => {
    setSeeding(true);
    fetch('http://127.0.0.1:8000/emails/seed', {
      method: 'POST',
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to seed demo data');
        }
        return res.json();
      })
      .then(() => {
        return fetchEmails();
      })
      .catch((err) => {
        console.error('[Dashboard Seed Error]', err);
        setError(err.message);
      })
      .finally(() => {
        setSeeding(false);
      });
  };

  // Filter and sort emails based on selected tab (most recent first)
  const filteredEmails = emails
    .filter((email) => {
      if (activeFilter === 'opened') return email.opened;
      if (activeFilter === 'not-opened') return !email.opened;
      if (activeFilter === 'follow-up') return email.needs_follow_up;
      return true;
    })
    .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));

  // Calculate aggregates dynamically from state
  const totalSent = emails.length;
  const totalOpened = emails.filter((e) => e.opened).length;
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0';
  const pendingFollowUps = emails.filter((e) => e.needs_follow_up).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white antialiased">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        
        {/* Header / Top Bar */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-6 border-b border-slate-800/60">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Antigravity Email Tracker
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Real-time open tracking and follow-up analytics
            </p>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-900/80 border border-slate-800 rounded-full shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">
              Connected to Gmail
            </span>
          </div>
        </header>

        {/* Error Alert Display */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm">
              <strong className="font-bold">Connection Error:</strong> {error}. Ensure your backend server is running and CORS is allowed.
            </p>
          </div>
        )}

        {/* Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Total Sent', value: totalSent, subtitle: 'Emails tracked', color: 'indigo' },
            { label: 'Total Opened', value: totalOpened, subtitle: `${openRate}% open rate`, color: 'emerald' },
            { label: 'Open Rate %', value: `${openRate}%`, subtitle: 'Average response speed', color: 'purple' },
            { label: 'Pending Follow-Ups', value: pendingFollowUps, subtitle: 'Needs attention', color: 'rose' },
          ].map((stat, idx) => (
            <div 
              key={idx} 
              className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/60 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 group"
            >
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold tracking-tight text-white group-hover:scale-105 transition-transform duration-300">
                  {stat.value}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700 inline-block" />
                {stat.subtitle}
              </p>
            </div>
          ))}
        </section>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex p-1 bg-slate-900/60 border border-slate-800 rounded-xl">
            {['all', 'opened', 'not-opened', 'follow-up'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all duration-200 ${
                  activeFilter === filter
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter.replace('-', ' ')}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400">
            Last synced: <span className="text-slate-300 font-mono">Just now</span>
          </div>
        </div>

        {/* Table / Onboarding Area */}
        {loading ? (
          <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40">
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Recipient</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Sent At</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Opens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {[1, 2, 3].map((n) => (
                    <tr key={n} className="animate-pulse">
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-32" /></td>
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-48" /></td>
                      <td className="py-4 px-6"><div className="h-4 bg-slate-800 rounded w-24" /></td>
                      <td className="py-4 px-6"><div className="h-6 bg-slate-800 rounded-full w-20" /></td>
                      <td className="py-4 px-6 text-center"><div className="h-4 bg-slate-800 rounded mx-auto w-8" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : emails.length === 0 ? (
          // Beautiful Onboarding Empty State
          <div className="bg-slate-900/20 backdrop-blur-md border border-slate-800/60 rounded-2xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            {/* Soft decorative background glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="max-w-3xl mx-auto text-center relative z-10">
              {/* Animated Envelope Logo */}
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-400 mb-8 shadow-inner hover:scale-105 hover:rotate-2 transition-all duration-300">
                <svg className="w-10 h-10 animate-pulse text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3 bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                No emails tracked yet
              </h2>
              <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto mb-10 leading-relaxed">
                Connect your outbox and gain complete visibility into recipient opens, reply logs, and automated follow-up indicators.
              </p>

              {/* Onboarding Steps Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-12">
                {[
                  {
                    step: "01",
                    title: "Mount Extension",
                    desc: "Load the /extension folder in Developer Mode inside Chrome.",
                    icon: (
                      <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.084 1.085l-.02.042m-1.064-1.103a.75.75 0 101.116-1.009l-.02.022m-1.096 1.025a2.25 2.25 0 003.116-.178l1.71-1.71a2.25 2.25 0 00-3.18-3.18l-1.31 1.31a2.25 2.25 0 000 3.18m-1.31 1.31a2.25 2.25 0 01-3.18-3.18l1.31-1.31a2.25 2.25 0 013.18 0l1.31 1.31m-5.41 5.41a2.25 2.25 0 01-3.18-3.18l1.31-1.31a2.25 2.25 0 013.18 0l1.31 1.31" />
                      </svg>
                    )
                  },
                  {
                    step: "02",
                    title: "Compose & Send",
                    desc: "Open Gmail and compose. We'll automatically inject a transparent tracking pixel.",
                    icon: (
                      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    )
                  },
                  {
                    step: "03",
                    title: "Monitor Results",
                    desc: "When recipients load the pixel, views show up here dynamically in real-time.",
                    icon: (
                      <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                      </svg>
                    )
                  }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5 hover:border-indigo-500/20 hover:bg-slate-900/60 transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-850 group-hover:scale-110 transition-transform duration-300">
                        {item.icon}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-600 group-hover:text-indigo-400/60 transition-colors">
                        STEP {item.step}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors mb-1.5">{item.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Seeding Demo Mode Control */}
              <div className="inline-flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 max-w-xl mx-auto w-full text-left">
                <div>
                  <h5 className="text-xs font-semibold text-slate-200">Portfolio Demo Mode</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">Quickly seed realistic emails and events to explore the tracking analytics console.</p>
                </div>
                <button
                  onClick={handleSeedData}
                  disabled={seeding}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer border-none"
                >
                  {seeding ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Seeding Console...
                    </>
                  ) : (
                    <>
                      <span>✨ Seed Demo Data</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        ) : (
          // Normal Table / List Area
          <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40">
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Recipient</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Sent At</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Opens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredEmails.length === 0 ? (
                    // Empty State Render for Filters
                    <tr>
                      <td colSpan="5" className="py-20 px-6 text-center">
                        <div className="max-w-md mx-auto flex flex-col items-center">
                          <div className="w-16 h-16 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex items-center justify-center mb-5">
                            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">No matching emails</h3>
                          <p className="text-slate-400 text-sm leading-relaxed">
                            There are currently no sent emails that match the "{activeFilter.replace('-', ' ')}" filter.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // Active Email Rows
                    filteredEmails.map((email) => (
                      <tr 
                        key={email.id} 
                        className="hover:bg-slate-900/20 transition-colors duration-150 group border-b border-slate-900"
                      >
                        <td className="py-4 px-6 text-sm font-semibold text-slate-200">
                          {email.recipient}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-300">
                          {email.subject}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-400 font-mono">
                          {new Date(email.sent_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-4 px-6 text-sm">
                          {email.needs_follow_up ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              Needs Follow-Up
                            </span>
                          ) : email.replied ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                              Replied
                            </span>
                          ) : email.opened ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Opened
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                              Unopened
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-center font-bold font-mono">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            email.open_count > 0 
                              ? 'text-indigo-400 bg-indigo-500/10' 
                              : 'text-slate-500'
                          }`}>
                            {email.open_count}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
