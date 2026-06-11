// panels.js — HTML content generators for each planet panel (QA/Dev Terminal theme with Multilingual Support)

function tagColor(tag) {
  if (tag.includes('tag-')) return tag;
  return 'tag-purple';
}

function skillBar(skill) {
  const cleanName = skill.name.toLowerCase().replace('#', 'sharp').replace('++', 'cpp').replace(/[^a-z0-9]+/g, '_');
  const specFile = `test_${cleanName}.spec.js`;
  return `
    <div class="test-suite-item" data-pct="${skill.pct}">
      <div class="test-suite-header">
        <span class="test-status pending">PENDING</span>
        <span class="test-name">${specFile}</span>
        <span class="test-duration">-- ms</span>
      </div>
      <div class="test-suite-details">
        <span class="test-check">○</span> ${skill.name}
      </div>
    </div>
  `;
}

function generateSparklinePath() {
  const width = 300;
  const height = 35;
  const segments = 12;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const x = (width / segments) * i;
    const y = height / 2 + Math.sin(i * 1.5) * height * 0.25 + (Math.random() - 0.5) * height * 0.15;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M 0,${(height/2).toFixed(1)} L ${points.join(' ')}`;
}

export const PANEL_RENDERERS = {
  cv: (t) => `
    <div class="cv-compact-header">
      <div class="cv-compact-title">
        <span class="cv-asteroid-emoji">☄️</span>
        <div>
          <div class="cv-title-text">${t.ui.panels.cv.title}</div>
          <div class="cv-title-sub">${t.ui.panels.cv.subtitle}</div>
        </div>
        <span class="cv-blink-dot blink-fast">● LIVE</span>
      </div>
      <a class="console-link-btn cv-download-btn"
         href="${t.ui.panels.cv.pdfPath}"
         download="${t.ui.panels.cv.pdfDownloadName}">
        <span>${t.ui.panels.cv.export}</span>
      </a>
    </div>

    <div class="cv-iframe-full-container">
      <iframe
        src="${t.ui.panels.cv.pdfPath}#toolbar=0&view=FitH"
        class="cv-iframe"
        title="Curriculum Vitae — Nicol Cuello Alvarez"
        loading="lazy"
      ></iframe>
      <div class="cv-scanline-overlay"></div>
    </div>
  `,

  about: (t) => `
    <div class="panel-header" style="justify-content: center; border-bottom: none; margin-bottom: 1rem; padding-bottom: 0;">
      <div class="panel-planet-icon-wrapper" style="color: var(--accent-gold)">
        <span class="panel-planet-icon">👨‍🚀</span>
      </div>
    </div>
    
    <div class="terminal-header">
      <span>${t.ui.panels.about.bootCheck}</span>
      <span class="status blink-fast">${t.ui.panels.about.runningStatus}</span>
    </div>

    <div class="about-intro">
      <span class="command-prompt">&gt;_</span> ${t.ui.panels.about.hello}<br/>
      <span class="name-highlight">${t.profile.name}</span>
    </div>
    <div class="about-role">&gt; ${t.ui.panels.about.rolePrefix} ${t.profile.role}</div>
    <p class="about-bio">${t.profile.bio}</p>
    
    <div class="stats-row">
      ${t.profile.stats.map(s => `
        <div class="stat-box">
          <span class="stat-number">${s.number}</span>
          <span class="stat-label">${s.label}</span>
        </div>
      `).join('')}
    </div>
    
    <p class="section-heading">${t.ui.panels.about.orbitalControl}</p>
    <div class="card terminal-card-inset">
      <p class="card-desc" style="line-height:1.7; font-family:var(--font-mono); font-size: 0.75rem;">
        <span style="color:var(--accent-secondary)">${t.ui.panels.about.telemetryHelp}</span><br/>
        ${t.ui.panels.about.telemetryHint}<br/>
        <strong style="color:var(--text-primary)">${t.ui.panels.about.dragHint}</strong> ${t.ui.panels.about.dragDesc}<br/>
        <strong style="color:var(--text-primary)">${t.ui.panels.about.scrollHint}</strong> ${t.ui.panels.about.scrollDesc}<br/>
        <strong style="color:var(--text-primary)">${t.ui.panels.about.clickHint}</strong> ${t.ui.panels.about.clickDesc}<br/><br/>
        <span style="color:var(--accent-green)">${t.ui.panels.about.keplerianText}</span>
      </p>
    </div>
  `,

  skills: (t) => `
    <div class="panel-header" style="justify-content: center; border-bottom: none; margin-bottom: 1rem; padding-bottom: 0;">
      <div class="panel-planet-icon-wrapper" style="color: var(--accent-primary)">
        <span class="panel-planet-icon">⚡</span>
      </div>
    </div>

    <div class="terminal-header">
      <span>${t.ui.panels.skills.testResults}</span>
      <span style="color:var(--accent-green)">${t.ui.panels.skills.systemOnline}</span>
    </div>

    <p class="section-heading">${t.ui.panels.skills.devStack}</p>
    ${t.skills.development.map(skillBar).join('')}
    
    <p class="section-heading">${t.ui.panels.skills.qaStack}</p>
    ${t.skills.qa.map(skillBar).join('')}
    
    <p class="section-heading">${t.ui.panels.skills.toolsHeader}</p>
    <div class="card" style="background: rgba(255,255,255,0.01);">
      <div class="card-tags">
        ${t.skills.tools.map(tool => `<span class="tag tag-purple">${tool}</span>`).join('')}
      </div>
    </div>
  `,

  experience: (t) => `
    <div class="panel-header" style="justify-content: center; border-bottom: none; margin-bottom: 1rem; padding-bottom: 0;">
      <div class="panel-planet-icon-wrapper" style="color: var(--accent-secondary)">
        <span class="panel-planet-icon">💼</span>
      </div>
    </div>

    <div class="terminal-header">
      <span>${t.ui.panels.experience.pipelineHistory}</span>
      <span>${t.ui.panels.experience.status}</span>
    </div>

    <div class="timeline">
      ${t.experience.map(e => `
        <div class="timeline-item terminal-log-item">
          <div class="log-header">
            <span class="log-badge">${t.ui.panels.experience.deploySuccess}</span>
            <span class="log-role">${e.role}</span>
          </div>
          <div class="log-meta">
            <span class="log-company">@ ${e.company}</span>
            <span class="log-time">📅 ${e.period} · ${e.type}</span>
          </div>
          <div class="log-desc">${e.desc}</div>
          <div class="card-tags">
            ${(() => {
              const colorClass = e.tags.find(tag => tag.startsWith('tag-')) || 'tag-cyan';
              const contentTags = e.tags.filter(tag => !tag.startsWith('tag-'));
              return contentTags.map(tag => `<span class="tag ${colorClass}">${tag}</span>`).join('');
            })()}
          </div>
        </div>
      `).join('')}
    </div>
  `,

  projects: (t) => `
    <div class="panel-header" style="justify-content: center; border-bottom: none; margin-bottom: 1rem; padding-bottom: 0;">
      <div class="panel-planet-icon-wrapper" style="color: #ff6b35">
        <span class="panel-planet-icon">🚀</span>
      </div>
    </div>

    <div class="terminal-header">
      <span>${t.ui.panels.projects.status}</span>
      <span>${t.ui.panels.projects.repos.replace('{count}', t.projects.length)}</span>
    </div>

    <div class="projects-list">
      ${t.projects.map(p => {
        const badgeClass = p.status === 'active' ? 'badge-active' : 'badge-completed';
        const badgeText = p.status.toUpperCase();
        return `
          <div class="card service-card">
            <div class="service-header">
              <span class="service-name">${p.name}</span>
              <span class="badge ${badgeClass}">
                <span class="badge-dot"></span>
                ${badgeText}
              </span>
            </div>
            
            <p class="card-desc">${p.desc}</p>
            
            <div class="service-telemetry-chart">
              <div class="telemetry-chart-header">
                <span>${t.ui.panels.projects.telemetrySignal}</span>
                <span class="telemetry-ms">${t.ui.panels.projects.stable}</span>
              </div>
              <svg class="sparkline-svg" viewBox="0 0 300 35">
                <path class="sparkline-path" d="${generateSparklinePath()}"></path>
              </svg>
            </div>
            
            <div class="card-tags">
              ${p.tech.map(techName => {
                let tagColor = 'tag-cyan';
                const name = techName.toLowerCase();
                if (name.includes('c#') || name.includes('c++') || name.includes('.net')) tagColor = 'tag-purple';
                else if (name.includes('sql') || name.includes('db') || name.includes('oracle') || name.includes('mongo') || name.includes('database')) tagColor = 'tag-gold';
                else if (name.includes('cypress') || name.includes('test') || name.includes('qa') || name.includes('jira') || name.includes('devops') || name.includes('planning')) tagColor = 'tag-green';
                else if (name.includes('javascript') || name.includes('typescript') || name.includes('react') || name.includes('html') || name.includes('css')) tagColor = 'tag-cyan';
                return `<span class="tag ${tagColor}">${techName}</span>`;
              }).join('')}
            </div>
            
            <div style="margin-top: 1rem; display: flex; justify-content: flex-end;">
              <a class="console-link-btn" href="${p.github}" target="_blank" rel="noopener">
                <span>${t.ui.panels.projects.viewSource}</span> ↗
              </a>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `,

  education: (t) => `
    <div class="panel-header" style="justify-content: center; border-bottom: none; margin-bottom: 1rem; padding-bottom: 0;">
      <div class="panel-planet-icon-wrapper" style="color: var(--accent-gold)">
        <span class="panel-planet-icon">🎓</span>
      </div>
    </div>

    <div class="terminal-header">
      <span>${t.ui.panels.education.registrySystem}</span>
      <span>${t.ui.panels.education.verified}</span>
    </div>

    <p class="section-heading">${t.ui.panels.education.academicDegrees}</p>
    ${t.education.map(e => `
      <div class="card credential-card">
        <div class="credential-header">
          <span class="credential-check">${t.ui.panels.education.verifiedCheck}</span>
          <div class="card-title">${e.degree}</div>
        </div>
        <div class="card-subtitle">${e.school}</div>
        <div class="card-meta">REG_PERIOD: ${e.period}</div>
        <div class="card-desc">${e.desc}</div>
      </div>
    `).join('')}

    <p class="section-heading">${t.ui.panels.education.certsAndBadges}</p>
    ${t.certifications.map(c => `
      <div class="card credential-card">
        <div style="display:flex;align-items:center;gap:0.8rem">
          <span style="font-size:1.8rem">${c.icon}</span>
          <div>
            <div class="card-title" style="margin-bottom:2px">${c.name}</div>
            <div class="card-subtitle">${c.issuer}</div>
            <div class="card-meta">REG_YEAR: ${c.year}</div>
          </div>
        </div>
      </div>
    `).join('')}

    <p class="section-heading">${t.ui.panels.education.recSystems}</p>
    <div class="card terminal-card-inset" style="border-color:rgba(108, 99, 255, 0.35);">
      <div style="font-family:var(--font-mono); font-size:0.75rem; line-height:1.6; margin-bottom: 12px;">
        <span style="color:var(--accent-secondary)">${t.ui.panels.education.simulationCmd}</span><br/>
        ${t.ui.panels.education.simulationDesc}
      </div>
      <button class="hud-btn" onclick="window.openSpacePacman()" style="width:100%; justify-content:center; gap:8px;">
        <span>${t.ui.panels.education.simulationBtn}</span>
      </button>
    </div>
  `,

  contact: (t) => `
    <div class="panel-header" style="justify-content: center; border-bottom: none; margin-bottom: 1rem; padding-bottom: 0;">
      <div class="panel-planet-icon-wrapper" style="color: #00ff88">
        <span class="panel-planet-icon">📡</span>
      </div>
    </div>

    <div class="terminal-header">
      <span>${t.ui.panels.contact.initialized}</span>
      <span class="status blink-fast" style="color:var(--accent-green)">${t.ui.panels.contact.txActive}</span>
    </div>

    <div class="card" style="border-color:rgba(0,255,136,0.2);background:rgba(0,255,136,0.02);margin-bottom:1.5rem">
      <p class="card-desc" style="line-height:1.7; font-family:var(--font-mono); font-size: 0.78rem;">
        <span style="color:var(--accent-green)">${t.ui.panels.contact.pingCmd}</span><br/>
        ${t.ui.panels.contact.pingDesc}
      </p>
    </div>

    <div class="contact-grid">
      <a class="contact-card" href="mailto:${t.profile.email}" target="_blank">
        <span class="contact-icon">📧</span>
        <span class="contact-label">ROUTE_EMAIL</span>
        <span class="contact-value">${t.profile.email}</span>
      </a>
      <a class="contact-card" href="https://${t.profile.linkedin}" target="_blank" rel="noopener">
        <span class="contact-icon">🔗</span>
        <span class="contact-label">ROUTE_LINKEDIN</span>
        <span class="contact-value">${t.profile.linkedin}</span>
      </a>
      <a class="contact-card" href="https://${t.profile.github}" target="_blank" rel="noopener">
        <span class="contact-icon">💻</span>
        <span class="contact-label">ROUTE_GITHUB</span>
        <span class="contact-value">${t.profile.github}</span>
      </a>
      <div class="contact-card">
        <span class="contact-icon">📍</span>
        <span class="contact-label">GPS_COORDS</span>
        <span class="contact-value">${t.profile.location}</span>
      </div>
    </div>
  `,
};

export function animateSkillBars(container) {
  const items = container.querySelectorAll('.test-suite-item');
  items.forEach((item, index) => {
    const statusEl = item.querySelector('.test-status');
    const checkEl = item.querySelector('.test-check');
    const durationEl = item.querySelector('.test-duration');
    const fillEl = item.querySelector('.skill-fill');
    const targetPct = item.getAttribute('data-pct');

    statusEl.className = 'test-status pending';
    statusEl.textContent = 'PENDING';
    if (checkEl) checkEl.textContent = '○';
    if (durationEl) durationEl.textContent = '-- ms';
    if (fillEl) fillEl.style.width = '0%';

    setTimeout(() => {
      statusEl.className = 'test-status running';
      statusEl.textContent = 'RUNNING';

      if (fillEl) {
        fillEl.style.width = `${targetPct}%`;
        fillEl.classList.add('animated');
      }

      const runDuration = Math.floor(Math.random() * 80 + 35);
      setTimeout(() => {
        statusEl.className = 'test-status pass';
        statusEl.textContent = 'PASS';
        if (checkEl) {
          checkEl.textContent = '✓';
        }
        if (durationEl) {
          durationEl.textContent = `${runDuration}ms`;
        }
      }, 600);
    }, index * 250);
  });
}
