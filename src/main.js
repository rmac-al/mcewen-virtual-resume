import { resumeData } from './js/resume.js';
import { initAvatar, loadAvatarModel, triggerNod, triggerShake, setAvatar3DVisibility } from './js/avatar.js';
import { initVoices, speak, stopSpeaking, toggleTts, ttsState, updateVoiceSettings } from './js/tts.js';
import { getInterviewAnswer, analyzeJobFit } from './js/ai.js?v=2';

// DOM elements
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const suggestionChips = document.getElementById('suggestion-chips');
const canvasMuteBtn = document.getElementById('canvas-mute-btn');

// Start up application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 3D Engine
  initAvatar('avatar-container', 'canvas3d', 'avatar-loader');
  
  // 2. Initialize TTS Voices
  initVoices((voices) => {
    populateVoiceDropdown(voices);
  });

  // Force 2D visual display mode since 3D is deprecated
  const initialMode = '2d';
  updateVisualDisplayMode(initialMode);

  // 3. Render Resume Details dynamically from data
  renderResume();

  // 4. Setup Tab Navigation
  setupTabs();

  // 5. Setup Chat Submit listeners
  setupChat();

  // 6. Setup Analyzer listeners
  setupAnalyzer();

  // 7. Setup Configuration panel controls
  setupConfig();
  
  // 8. Setup Headshot Zoom
  setupImageZoom();
  
  // Greeting!
  setTimeout(() => {
    handleBotResponse("Hello! I am Robert McEwen's virtual interview assistant. Ask me anything about his operations experience, PMO projects, or skills, or paste a job description in the Job Fit tab to see if he is a good match!");
  }, 1500);
});

// ------------------------------------------------------------
// TAB NAVIGATION SETUP
// ------------------------------------------------------------
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPane = tab.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(targetPane).classList.add('active');
    });
  });
}

// ------------------------------------------------------------
// RESUME RENDERER
// ------------------------------------------------------------
function renderResume() {
  // Summary
  const summaryEl = document.getElementById('resume-summary-text');
  if (summaryEl) summaryEl.innerText = resumeData.summary;

  // Timeline (Experience)
  const timelineEl = document.getElementById('experience-timeline');
  if (timelineEl) {
    timelineEl.innerHTML = '';
    resumeData.experience.forEach((job) => {
      const timelineItem = document.createElement('div');
      timelineItem.className = 'timeline-item';
      
      // Setup custom click action: Avatar speaks about this job when clicked!
      timelineItem.addEventListener('click', () => {
        const query = `Tell me about your role at ${job.company}`;
        chatInput.value = query;
        submitQuestion(query);
      });

      timelineItem.innerHTML = `
        <div class="timeline-header">
          <div>
            <div class="timeline-role">${job.role}</div>
            <div class="timeline-company">${job.company}</div>
          </div>
          <span class="timeline-period">${job.period}</span>
        </div>
        <p class="timeline-desc">${job.description}</p>
        <ul class="timeline-bullets">
          ${job.bullets.map(bullet => `<li>${bullet}</li>`).join('')}
        </ul>
      `;
      timelineEl.appendChild(timelineItem);
    });
  }

  // Skills
  const skillsContainer = document.getElementById('skills-categories-grid');
  if (skillsContainer) {
    skillsContainer.innerHTML = '';
    
    // Group skills by category
    const categories = {};
    resumeData.skills.forEach(skill => {
      if (!categories[skill.category]) {
        categories[skill.category] = [];
      }
      categories[skill.category].push(skill);
    });

    for (const [catName, catSkills] of Object.entries(categories)) {
      const card = document.createElement('div');
      card.className = 'skill-category-card';
      
      let skillsHtml = '';
      catSkills.forEach(skill => {
        skillsHtml += `
          <div class="skill-progress-bar">
            <div class="skill-info">
              <span class="skill-name">${skill.name}</span>
              <span class="skill-percentage">${skill.level}%</span>
            </div>
            <div class="bar-bg">
              <div class="bar-fill" style="width: 0%"></div>
            </div>
          </div>
        `;
      });

      card.innerHTML = `
        <h4 class="category-name">${catName}</h4>
        <div class="skills-list">
          ${skillsHtml}
        </div>
      `;
      skillsContainer.appendChild(card);
      
      // Animate progress bar widths after insertion
      setTimeout(() => {
        const fills = card.querySelectorAll('.bar-fill');
        catSkills.forEach((skill, idx) => {
          fills[idx].style.width = `${skill.level}%`;
        });
      }, 100);
    }
  }

  // Projects
  const projectsGrid = document.getElementById('projects-grid');
  if (projectsGrid) {
    projectsGrid.innerHTML = '';
    resumeData.projects.forEach(project => {
      const card = document.createElement('div');
      card.className = 'project-card';
      
      card.innerHTML = `
        <div>
          <div class="project-title">${project.title}</div>
          <p class="project-desc">${project.description}</p>
          <div class="project-tags">
            ${project.technologies.map(tech => `<span class="project-tag">${tech}</span>`).join('')}
          </div>
        </div>
        ${project.link !== '#' ? `
        <a href="${project.link}" target="_blank" class="project-link">
          View Details
          <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 24 24">
            <path d="M5 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7H5V5h7V3H5zm9 0v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
          </svg>
        </a>
        ` : ''}
      `;
      projectsGrid.appendChild(card);
    });
  }

  // Education
  const educationGrid = document.getElementById('education-grid');
  if (educationGrid) {
    educationGrid.innerHTML = '';
    resumeData.education.forEach(edu => {
      const card = document.createElement('div');
      card.className = 'skill-category-card';
      card.innerHTML = `
        <h4 class="category-name" style="color: var(--color-secondary);">${edu.institution}</h4>
        <div style="margin-top: 8px;">
          <div style="font-weight: 600; color: #fff;">${edu.degree}</div>
          <div style="color: var(--color-text-muted); font-size: 0.9rem; margin-top: 4px; font-family: var(--font-mono);">${edu.period}</div>
          <p style="margin-top: 10px; font-size: 0.9rem; color: var(--color-text-muted);">${edu.details}</p>
        </div>
      `;
      educationGrid.appendChild(card);
    });
  }
}

// ------------------------------------------------------------
// CHAT & INTERVIEW INTERACTION
// ------------------------------------------------------------
function setupChat() {
  // Click suggest chips
  suggestionChips.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip-btn')) {
      const question = e.target.innerText;
      chatInput.value = question;
      submitQuestion(question);
    }
  });

  // Press enter
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = chatInput.value.trim();
      if (val) submitQuestion(val);
    }
  });

  // Click send button
  sendBtn.addEventListener('click', () => {
    const val = chatInput.value.trim();
    if (val) submitQuestion(val);
  });

  // Canvas Mute toggle click
  canvasMuteBtn.addEventListener('click', () => {
    const isEnabled = !ttsState.enabled;
    toggleTts(isEnabled);
    
    // Update button visual
    canvasMuteBtn.classList.toggle('muted', !isEnabled);
    if (isEnabled) {
      canvasMuteBtn.innerHTML = `
        <svg style="width: 18px; height: 18px; fill: currentColor;" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm-2 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
        </svg>
      `;
    } else {
      canvasMuteBtn.innerHTML = `
        <svg style="width: 18px; height: 18px; fill: currentColor;" viewBox="0 0 24 24">
          <path d="M4.27 3L3 4.27l9 9v.28c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-1.73l6 6L21 20 4.27 3zM14 7h4V3h-6v5.18l2 2z"/>
        </svg>
      `;
    }
  });
  
  // Set initial mute button state
  const isEnabled = ttsState.enabled;
  canvasMuteBtn.classList.toggle('muted', !isEnabled);
  if (isEnabled) {
    canvasMuteBtn.innerHTML = `
      <svg style="width: 18px; height: 18px; fill: currentColor;" viewBox="0 0 24 24">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm-2 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
      </svg>
    `;
  } else {
    canvasMuteBtn.innerHTML = `
      <svg style="width: 18px; height: 18px; fill: currentColor;" viewBox="0 0 24 24">
        <path d="M4.27 3L3 4.27l9 9v.28c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-1.73l6 6L21 20 4.27 3zM14 7h4V3h-6v5.18l2 2z"/>
      </svg>
    `;
  }
}

async function submitQuestion(question) {
  // Stop speaking current audio
  stopSpeaking();
  
  // Clear visualizer pulse on stop
  const portraitView = document.getElementById('portrait-view');
  if (portraitView) portraitView.classList.remove('speaking');
  
  // Clear input
  chatInput.value = '';

  // Append user bubble to chat pane
  appendChatBubble('recruiter', question);
  
  // Admin backdoor password check
  const trimmedLower = question.trim().toLowerCase();
  if (trimmedLower === 'admin-config' || trimmedLower === 'show-config') {
    const configBtn = document.getElementById('tab-btn-config');
    if (configBtn) {
      const isHidden = configBtn.classList.contains('hidden');
      configBtn.classList.toggle('hidden');
      
      if (isHidden) {
        handleBotResponse("Admin mode activated. The Configuration tab has been unlocked and is now visible at the top.");
      } else {
        // If we are currently on the configuration tab, switch back to the interview tab before hiding
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && activeTab.id === 'tab-btn-config') {
          const firstTab = document.querySelector('.tab-btn[data-tab="interview-tab"]');
          if (firstTab) firstTab.click();
        }
        handleBotResponse("Admin mode deactivated. The Configuration tab has been hidden and secured.");
      }
    }
    return;
  }
  
  // Create bot typing bubble
  const typingBubble = appendTypingIndicator();
  
  // Scroll chat history
  scrollToBottom();

  // Handled chat typing simulation

  try {
    // Check active job description from fit analyzer to inject context if available
    const jdText = document.getElementById('jd-textarea').value.trim();

    // Call dynamic or fallback AI logic
    const answer = await getInterviewAnswer(question, jdText);
    
    // Remove typing indicator
    typingBubble.remove();

    // Handle bot response
    handleBotResponse(answer);
  } catch (error) {
    typingBubble.remove();
    appendChatBubble('avatar', "Sorry, Robert's assistant had trouble processing that question. Can you try again?");
    triggerShake();
  }
}

function handleBotResponse(text) {
  // 1. Append bubble to Chat tab
  appendChatBubble('avatar', text);
  scrollToBottom();

  // 3. Trigger approval nod
  triggerNod();

  // Start speaking visualizer pulse
  const portraitView = document.getElementById('portrait-view');
  if (portraitView) portraitView.classList.add('speaking');

  // Strip JSON debug/error notes for Text-to-Speech to prevent browser Web Speech API crashes
  let cleanSpeechText = text;
  if (text.includes(" (Note: API call failed")) {
    cleanSpeechText = text.split(" (Note: API call failed")[0];
  }

  // 4. Trigger TTS Voice Synthesis with mouth movement (lip-sync)
  speak(
    cleanSpeechText,
    null, // boundary callback (jaw animation handled dynamically in avatar.js based on ttsState.isSpeaking flag)
    () => {
      // Remove visualizer pulse on end
      if (portraitView) portraitView.classList.remove('speaking');
    }
  );
}

function appendChatBubble(sender, text) {
  const container = document.createElement('div');
  container.className = `chat-message ${sender}`;
  
  const senderLabel = sender === 'recruiter' ? 'Recruiter' : 'AI Assistant';
  
  container.innerHTML = `
    <div class="chat-message-sender">${senderLabel}</div>
    <div>${text}</div>
  `;
  
  chatHistory.appendChild(container);
}

function appendTypingIndicator() {
  const container = document.createElement('div');
  container.className = 'chat-message avatar';
  container.id = 'typing-indicator-wrapper';
  
  container.innerHTML = `
    <div class="chat-message-sender">AI Assistant</div>
    <div class="typing-indicator">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
  chatHistory.appendChild(container);
  return container;
}

function scrollToBottom() {
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// ------------------------------------------------------------
// JOB FIT ANALYZER SETUP
// ------------------------------------------------------------
function setupAnalyzer() {
  const jdTextarea = document.getElementById('jd-textarea');
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultsDiv = document.getElementById('analyzer-results-panel');
  
  analyzeBtn.addEventListener('click', async () => {
    const jd = jdTextarea.value.trim();
    if (!jd) return;
    
    // Show loading state
    const originalText = analyzeBtn.innerText;
    analyzeBtn.innerText = "ANALYZING...";
    analyzeBtn.disabled = true;
    
    try {
      // Perform matching algorithm dynamically via AI
      const result = await analyzeJobFit(jd);
    
    // Display result panel
    resultsDiv.style.display = 'block';
    
    // Set match score text and circular progress
    document.getElementById('fit-score-percent').innerText = `${result.score}%`;
    const circleProgress = document.getElementById('svg-circle-progress');
    
    // Calc svg stroke-dashoffset: circumference = 2 * PI * r (r=45) = 283
    const circumference = 283;
    const offset = circumference - (result.score / 100) * circumference;
    circleProgress.style.strokeDashoffset = offset;
    
    // Set pitch text
    document.getElementById('fit-pitch-text').innerText = result.pitch;
    
    // Set matched skills
    const matchesList = document.getElementById('fit-matches-list');
    matchesList.innerHTML = '';
    result.matches.forEach(match => {
      const badge = document.createElement('span');
      badge.className = 'badge-item match';
      badge.innerText = match;
      matchesList.appendChild(badge);
    });

    // Set missing gaps
    const gapsList = document.getElementById('fit-gaps-list');
    gapsList.innerHTML = '';
    result.gaps.forEach(gap => {
      const badge = document.createElement('span');
      badge.className = 'badge-item gap';
      badge.innerText = gap;
      gapsList.appendChild(badge);
    });

    // Scroll container down
    document.querySelector('.tab-viewport').scrollTop = resultsDiv.offsetTop;
    
    // Trigger avatar pitch answer speech!
    handleBotResponse(`I've analyzed that job description! I score as a ${result.score} percent compatibility fit. ${result.pitch}`);
    
    } catch (error) {
      console.error("Fit Analyzer Error:", error);
      alert("Failed to analyze job fit. Please ensure your API key is correct or try again.");
    } finally {
      analyzeBtn.innerText = originalText;
      analyzeBtn.disabled = false;
    }
  });

  // PDF Export Logic
  const exportPdfBtn = document.getElementById('export-pdf-btn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      const score = document.getElementById('fit-score-percent').innerText;
      const pitch = document.getElementById('fit-pitch-text').innerText;
      const matches = Array.from(document.querySelectorAll('#fit-matches-list .badge-item')).map(el => el.innerText);
      const gaps = Array.from(document.querySelectorAll('#fit-gaps-list .badge-item')).map(el => el.innerText);
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Robert McEwen - Job Fit Analysis</title>
            <style>
              body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
              h1 { color: #111; border-bottom: 2px solid #00e5ff; padding-bottom: 10px; margin-bottom: 30px; }
              .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
              .candidate-name { font-size: 24px; font-weight: bold; margin: 0; }
              .candidate-title { font-size: 16px; color: #666; margin: 0; }
              .score-box { background: #f8f9fa; border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px; }
              .score-value { font-size: 36px; font-weight: bold; color: #00e5ff; }
              .section-title { font-size: 18px; font-weight: bold; color: #444; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
              .pitch { background: #f0f7ff; border-left: 4px solid #0052ff; padding: 15px 20px; border-radius: 0 8px 8px 0; font-style: italic; margin-bottom: 30px; }
              ul { padding-left: 20px; }
              li { margin-bottom: 8px; }
              .match-item { color: #008a00; font-weight: 500; }
              .gap-item { color: #d8000c; font-weight: 500; }
              @media print {
                body { padding: 0; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <p class="candidate-name">Robert McEwen</p>
                <p class="candidate-title">Strategic Operations Leader & Project Manager</p>
              </div>
              <div style="text-align: right; color: #666; font-size: 14px;">
                Generated by Virtual Assistant
              </div>
            </div>
            
            <h1>Job Fit Compatibility Report</h1>
            
            <div class="score-box">
              <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #666;">Overall Compatibility Score</div>
              <div class="score-value">${score}</div>
            </div>
            
            <div class="section-title">Executive Summary</div>
            <div class="pitch">"${pitch}"</div>
            
            <div class="section-title">Key Matches (Strengths)</div>
            <ul>
              ${matches.map(m => `<li class="match-item">${m}</li>`).join('')}
            </ul>
            
            <div class="section-title">Identified Gaps (Growth Areas)</div>
            <ul>
              ${gaps.map(g => `<li class="gap-item">${g}</li>`).join('')}
            </ul>
            
            <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px;">
              Contact Robert at rmcewen3@gmail.com or 757-256-5752 to schedule an interview.
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      // Give browser a moment to render styles before printing
      setTimeout(() => {
        printWindow.print();
      }, 500);
    });
  }
}

// ------------------------------------------------------------
// CONFIGURATION PANEL SETUP
// ------------------------------------------------------------
function setupConfig() {
  const avatarUrlInput = document.getElementById('cfg-avatar-url');
  const voiceSelect = document.getElementById('cfg-voice-select');
  const pitchInput = document.getElementById('cfg-pitch');
  const rateInput = document.getElementById('cfg-rate');
  const visualModeSelect = document.getElementById('cfg-visual-mode');
  const saveBtn = document.getElementById('save-config-btn');

  // Load existing configuration inputs from storage
  avatarUrlInput.value = localStorage.getItem('avatar_glb_url') || 'https://raw.githubusercontent.com/met4citizen/TalkingHead/main/public/avatars/avatar.glb';
  pitchInput.value = ttsState.pitch;
  rateInput.value = ttsState.rate;
  if (visualModeSelect) {
    visualModeSelect.value = localStorage.getItem('visual_mode') || '2d';
  }

  saveBtn.addEventListener('click', () => {
    // 2. Check and reload Avatar GLB Model if changed
    const newAvatarUrl = avatarUrlInput.value.trim();
    const currentAvatarUrl = localStorage.getItem('avatar_glb_url') || 'https://raw.githubusercontent.com/met4citizen/TalkingHead/main/public/avatars/avatar.glb';
    if (newAvatarUrl && newAvatarUrl !== currentAvatarUrl) {
      loadAvatarModel(newAvatarUrl);
    }

    // 3. Save Voice Synthesis configs
    updateVoiceSettings(voiceSelect.value, pitchInput.value, rateInput.value);

    // 4. Save and Apply Visual Rendering Mode
    if (visualModeSelect) {
      updateVisualDisplayMode(visualModeSelect.value);
    }

    // Highlight confirmation feedback
    saveBtn.innerText = "CONFIG SAVED ✓";
    saveBtn.style.background = 'linear-gradient(135deg, #00ff66, #00ffff)';
    
    // Speech feedback!
    handleBotResponse("Configuration settings updated successfully.");

    setTimeout(() => {
      saveBtn.innerText = "SAVE CONFIGURATION";
      saveBtn.style.background = 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))';
    }, 2000);
  });
}

function populateVoiceDropdown(voices) {
  const voiceSelect = document.getElementById('cfg-voice-select');
  if (!voiceSelect) return;
  
  voiceSelect.innerHTML = '';
  
  // Sort English voices first for convenience
  const sortedVoices = [...voices].sort((a, b) => {
    if (a.lang.startsWith('en') && !b.lang.startsWith('en')) return -1;
    if (!a.lang.startsWith('en') && b.lang.startsWith('en')) return 1;
    return a.name.localeCompare(b.name);
  });

  // Find the best voice candidate if none is stashed
  if (!ttsState.voiceName && voices.length > 0) {
    // 1. Try to find a younger-sounding British English (en-GB) female voice first (Libby, Sonia, Google UK Female)
    let bestVoice = voices.find(v => (v.lang === 'en-GB' || v.lang === 'en_GB') && (v.name.includes('Libby') || v.name.includes('Sonia') || v.name.includes('Google UK English Female') || v.name.includes('Natural') || v.name.includes('Online')));
    
    // Fallback to offline UK voices (Hazel, George, Susan, etc.) if online natural ones are not available
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang === 'en-GB' || v.lang === 'en_GB' || v.name.toLowerCase().includes('uk') || v.name.toLowerCase().includes('great britain') || v.name.toLowerCase().includes('hazel') || v.name.toLowerCase().includes('george') || v.name.toLowerCase().includes('susan'));
    }
    
    // 2. Fallback to US English (en-US)
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en_US' || v.name.toLowerCase().includes('us') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('zira'));
    }
    
    // 3. Fallback to any English voice
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang.startsWith('en'));
    }
    
    // 4. Fallback to first voice
    if (!bestVoice) {
      bestVoice = voices[0];
    }
    
    if (bestVoice) {
      ttsState.voiceName = bestVoice.name;
      localStorage.setItem('tts_voice_name', bestVoice.name);
    }
  }

  sortedVoices.forEach((voice) => {
    const option = document.createElement('option');
    option.value = voice.name;
    option.innerText = `${voice.name} (${voice.lang})`;
    
    if (ttsState.voiceName && voice.name === ttsState.voiceName) {
      option.selected = true;
    }
    
    voiceSelect.appendChild(option);
  });
}

// ------------------------------------------------------------
// VISUAL RENDERING MODE CONTROLLER
// ------------------------------------------------------------
function updateVisualDisplayMode(mode) {
  const portraitView = document.getElementById('portrait-view');
  const avatarLoader = document.getElementById('avatar-loader');
  
  if (mode === '3d') {
    if (portraitView) portraitView.classList.add('hidden');
    setAvatar3DVisibility(true);
  } else {
    if (portraitView) portraitView.classList.remove('hidden');
    setAvatar3DVisibility(false);
    if (avatarLoader) avatarLoader.style.display = 'none';
  }
  localStorage.setItem('visual_mode', mode);
}

// ------------------------------------------------------------
// IMAGE ZOOM MODAL SETUP
// ------------------------------------------------------------
function setupImageZoom() {
  const headshotDiv = document.querySelector('.candidate-headshot');
  const modal = document.getElementById('image-zoom-modal');
  const zoomedImg = document.getElementById('zoomed-image');
  const closeBtn = document.getElementById('zoom-close');
  
  if (headshotDiv && modal && zoomedImg && closeBtn) {
    // Add pointer cursor styling
    headshotDiv.style.cursor = 'pointer';
    headshotDiv.setAttribute('title', 'Click to enlarge headshot');
    
    headshotDiv.addEventListener('click', () => {
      const img = headshotDiv.querySelector('img');
      if (img) {
        zoomedImg.src = img.src;
        modal.classList.add('active');
      }
    });
    
    // Close modal on close button click
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
    
    // Close modal on clicking backdrop
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
    
    // Close modal on Escape key press
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        modal.classList.remove('active');
      }
    });
  }
}
