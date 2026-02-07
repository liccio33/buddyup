// Suggested hashtags (users can also create custom ones)
const SUGGESTED_HASHTAGS = [
  '#hiking', '#photography', '#coffee', '#yoga', '#reading', '#movies', '#fitness', '#swimming',
  '#camping', '#cycling', '#boardgames', '#music', '#art', '#food', '#travel', '#running'
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TIME_SLOTS = ['6am-9am', '9am-12pm', '12pm-3pm', '3pm-6pm', '6pm-9pm', '9pm-12am', 'flexible'];

const STORAGE_KEY = 'activityPartnerData';

function getDaysInMonth(month, year) {
  const m = parseInt(month, 10);
  if (m === 2) {
    const y = year || new Date().getFullYear();
    return (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28;
  }
  const days = [31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[m] || 31;
}

function formatSlot(slot) {
  if (!slot) return '';
  const year = slot.year || new Date().getFullYear();
  const currentYear = new Date().getFullYear();
  const yearStr = year !== currentYear ? ` ${year}` : '';
  return `${MONTH_NAMES[slot.month - 1]} ${slot.day}${yearStr}, ${slot.time}`;
}

function getData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const d = JSON.parse(raw);
      d.events = d.events || [];
      d.ratings = d.ratings || [];
      d.posts = d.posts || [];
      d.messages = d.messages || [];
      d.requests = d.requests || [];
      d.plans = d.plans || [];
      d.users = (d.users || []).map(u => {
        if (u.schedule && !u.availability) {
          u.availability = [{ month: parseInt(u.schedule.month, 10) || new Date().getMonth() + 1, day: parseInt(u.schedule.day, 10) || 1, year: new Date().getFullYear(), time: u.schedule.time || 'flexible' }];
        }
        u.availability = u.availability || [];
        return u;
      });
      return d;
    } catch (_) {}
  }
  return {
    currentUser: null,
    users: [
      { id: '1', nickName: 'Alex', bio: 'Love outdoors and photography.', hashtags: ['#hiking', '#photography', '#coffee'], availability: [{ month: 3, day: 15, time: '9am-12pm' }] },
      { id: '2', nickName: 'Sam', bio: 'Yoga enthusiast, into reading.', hashtags: ['#hiking', '#yoga', '#reading'], availability: [{ month: 3, day: 16, time: '12pm-3pm' }] },
      { id: '3', nickName: 'Jordan', bio: 'Movie buff, love cafes.', hashtags: ['#photography', '#coffee', '#movies'], availability: [{ month: 3, day: 15, time: '9am-12pm' }] },
      { id: '4', nickName: 'Casey', bio: 'Fitness junkie.', hashtags: ['#yoga', '#fitness', '#swimming'], availability: [{ month: 4, day: 5, time: '6pm-9pm' }] },
      { id: '5', nickName: 'Riley', bio: 'Outdoor camping lover.', hashtags: ['#hiking', '#photography', '#camping'], availability: [{ month: 3, day: 22, time: 'flexible' }] }
    ],
    events: [
      { id: 'e1', user1Id: '1', user2Id: '3', date: '2025-03-10', activity: '#hiking #photography', description: 'Great hike at the park!', media: [], createdAt: Date.now() - 86400000 * 5 }
    ],
    ratings: [
      { id: 'r1', fromUserId: '3', toUserId: '1', stars: 5, comment: 'Alex was an amazing hiking partner! Very friendly and knowledgeable about trails.', eventId: 'e1', createdAt: Date.now() - 86400000 * 4 }
    ],
    posts: [
      { id: 'p1', userId: '1', type: 'text', content: 'Had an awesome day hiking with Jordan!', createdAt: Date.now() - 86400000 * 4 }
    ],
    messages: [],
    requests: [],
    plans: []
  };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function computeMatchScore(user, current) {
  if (!current || !current.hashtags || current.hashtags.length === 0) return 0;
  if (user.id === current.id) return -1;

  const userTags = new Set((user.hashtags || []).map(h => h.toLowerCase()));
  const currentTags = new Set((current.hashtags || []).map(h => h.toLowerCase()));
  let matchCount = 0;
  for (const t of currentTags) {
    if (userTags.has(t)) matchCount++;
  }

  const unionSize = Math.max(userTags.size, currentTags.size, 1);
  let score = (matchCount / unionSize) * 100;

  const ca = current.availability || [];
  const ua = user.availability || [];
  for (const cs of ca) {
    for (const us of ua) {
      if (cs.month === us.month && cs.day === us.day && cs.time === us.time) { score += 25; break; }
      else if (cs.month === us.month && cs.day === us.day) { score += 15; break; }
      else if (cs.month === us.month) { score += 5; break; }
    }
  }
  return Math.round(Math.min(score, 100));
}

function getRecommendations(data) {
  const current = data.currentUser;
  if (!current) return [];
  return data.users
    .filter(u => u.id !== current.id)
    .map(u => ({ user: u, score: computeMatchScore(u, current) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getUserById(data, id) {
  return data.users.find(u => u.id === id);
}

function getEventsForUser(data, userId) {
  return (data.events || []).filter(e => e.user1Id === userId || e.user2Id === userId);
}

function getRatingsForUser(data, userId) {
  return (data.ratings || []).filter(r => r.toUserId === userId);
}

function getPostsForUser(data, userId) {
  return (data.posts || []).filter(p => p.userId === userId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function haveEventTogether(data, userId1, userId2) {
  return (data.events || []).some(e =>
    (e.user1Id === userId1 && e.user2Id === userId2) || (e.user1Id === userId2 && e.user2Id === userId1)
  );
}

function hasRated(data, fromUserId, toUserId, eventId) {
  return (data.ratings || []).some(r => r.fromUserId === fromUserId && r.toUserId === toUserId && (!eventId || r.eventId === eventId));
}

// --- Calendar Grid ---
let calYear, calMonth, selectedSlots = [];

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const monthYearEl = document.getElementById('calMonthYear');
  if (!grid) return;

  const year = calYear || new Date().getFullYear();
  const month = calMonth !== undefined ? calMonth : new Date().getMonth() + 1;
  calYear = year;
  calMonth = month;

  monthYearEl.textContent = `${MONTH_NAMES[month - 1]} ${year}`;

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = getDaysInMonth(month, year);

  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-day cal-empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month}-${d}`;
    const isSelected = selectedSlots.some(s => s.month === month && s.day === d && s.year === year);
    html += `<div class="cal-day ${isSelected ? 'selected' : ''}" data-year="${year}" data-month="${month}" data-day="${d}">${d}</div>`;
  }
  grid.innerHTML = html;

  grid.querySelectorAll('.cal-day:not(.cal-empty)').forEach(el => {
    el.addEventListener('click', () => {
      const y = parseInt(el.dataset.year, 10);
      const m = parseInt(el.dataset.month, 10);
      const d = parseInt(el.dataset.day, 10);
      const time = document.getElementById('scheduleTime')?.value || 'flexible';
      const idx = selectedSlots.findIndex(s => s.year === y && s.month === m && s.day === d);
      if (idx >= 0) selectedSlots.splice(idx, 1);
      else selectedSlots.push({ year: y, month: m, day: d, time });
      renderCalendar();
      renderSelectedSlots();
    });
  });
}

function renderSelectedSlots() {
  const container = document.getElementById('selectedSlots');
  if (!container) return;
  container.innerHTML = selectedSlots.length ? '<strong>Selected:</strong> ' + selectedSlots.map(s => formatSlot({ ...s, month: s.month })).join(', ') : '';
}

// --- Custom Hashtags ---
let selectedHashtags = [];

function initHashtagInput(selected) {
  selectedHashtags = selected || [];
  const input = document.getElementById('hashtagInput');
  const listEl = document.getElementById('hashtagList');
  const suggestionsEl = document.getElementById('hashtagSuggestions');
  if (!input || !listEl) return;

  function renderTags() {
    listEl.innerHTML = '';
    selectedHashtags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'hashtag-option selected';
      span.textContent = tag;
      span.innerHTML += ' <span class="hashtag-remove">&times;</span>';
      span.querySelector('.hashtag-remove').onclick = (e) => {
        e.stopPropagation();
        selectedHashtags = selectedHashtags.filter(t => t !== tag);
        initHashtagInput(selectedHashtags);
      };
      listEl.appendChild(span);
    });
  }

  input.value = '';
  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      let val = input.value.trim();
      if (val && !val.startsWith('#')) val = '#' + val;
      if (val && !selectedHashtags.includes(val)) {
        selectedHashtags = [...selectedHashtags, val];
        initHashtagInput(selectedHashtags);
      }
    }
  };

  input.oninput = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { suggestionsEl.innerHTML = ''; return; }
    const prefix = q.startsWith('#') ? q : '#' + q;
    const matches = SUGGESTED_HASHTAGS.filter(h => h.toLowerCase().includes(prefix) && !selectedHashtags.includes(h)).slice(0, 5);
    suggestionsEl.innerHTML = matches.map(h => `<span class="hashtag-suggestion" data-tag="${escapeHtml(h)}">${escapeHtml(h)}</span>`).join('');
    suggestionsEl.querySelectorAll('.hashtag-suggestion').forEach(s => {
      s.onclick = () => {
        const tag = s.dataset.tag;
        if (!selectedHashtags.includes(tag)) {
          selectedHashtags = [...selectedHashtags, tag];
          initHashtagInput(selectedHashtags);
        }
      };
    });
  };

  renderTags();
}

// --- User Card ---
function renderUserCard(user, showScore, onClick, showActions = false) {
  const div = document.createElement('div');
  div.className = 'user-card';
  const initial = (user.nickName || '?')[0];
  const tags = (user.hashtags || []).slice(0, 3).map(t => `<span class="hashtag">${escapeHtml(t)}</span>`).join('');
  const av = user.availability || [];
  const avStr = av.length ? formatSlot(av[0]) : '';
  const schedule = avStr ? `<span class="schedule-badge">${avStr}</span>` : '';
  const scoreHtml = showScore ? `<div class="match-score">Match ${showScore}%</div>` : '';
  const actionsHtml = showActions ? `
    <div class="user-card-actions">
      <button type="button" class="btn btn-sm btn-secondary" data-action="message" data-user-id="${user.id}">Message</button>
      <button type="button" class="btn btn-sm btn-primary" data-action="request" data-user-id="${user.id}">Request to Go Out</button>
    </div>
  ` : '';
  div.innerHTML = `
    <div class="user-card-header">
      <div class="user-avatar">${initial}</div>
      <span class="user-name">${escapeHtml(user.nickName || 'Anonymous')}</span>
    </div>
    <div class="user-hashtags">${tags}</div>
    ${schedule}
    ${scoreHtml}
    ${actionsHtml}
  `;
  if (onClick && !showActions) div.addEventListener('click', () => onClick(user));
  if (showActions) {
    div.querySelector('[data-action="message"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openChat(user.id);
    });
    div.querySelector('[data-action="request"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      showRequestDialog(user);
    });
  }
  return div;
}

// --- User Page ---
function renderUserPage(userId) {
  const data = getData();
  const user = getUserById(data, userId);
  const current = data.currentUser;
  const container = document.getElementById('userPageContent');
  if (!user || !container) return;

  const isOwnProfile = current && current.id === userId;
  const events = getEventsForUser(data, userId);
  const ratings = getRatingsForUser(data, userId);
  const posts = getPostsForUser(data, userId);
  const canRate = current && current.id !== userId && haveEventTogether(data, current.id, userId) && !hasRated(data, current.id, userId);

  let html = `
    <a href="#home" class="back-link">&larr; Back to Home</a>
    <div class="user-profile-header">
      <div class="user-detail-avatar">${(user.nickName || '?')[0]}</div>
      <h1 class="user-detail-name">${escapeHtml(user.nickName || 'Anonymous')}</h1>
      ${user.bio ? `<p class="user-detail-bio">${escapeHtml(user.bio)}</p>` : ''}
      <div class="user-detail-hashtags">
        ${(user.hashtags || []).map(t => `<span class="hashtag">${escapeHtml(t)}</span>`).join('') || '<span class="hashtag">None</span>'}
      </div>
      ${(user.availability || []).length ? `<div class="user-availability">Available: ${(user.availability || []).map(s => formatSlot(s)).join(', ')}</div>` : ''}
    </div>
  `;

  if (canRate) {
    html += `
      <div class="rate-section" id="rateSection">
        <h3>Rate this user</h3>
        <p class="hint">You attended an activity together. Leave a rating:</p>
        <div class="star-rating" id="starRating">
          ${[1,2,3,4,5].map(i => `<span class="star" data-stars="${i}">&#9733;</span>`).join('')}
        </div>
        <textarea id="ratingComment" placeholder="Why did you give this rating?" rows="3"></textarea>
        <button type="button" class="btn btn-primary" id="submitRating">Submit Rating</button>
      </div>
    `;
  }

  html += `<h3>Past Events & Partners</h3><div class="events-list" id="eventsList">`;
  if (events.length === 0) html += '<p class="empty-item">No events yet.</p>';
  else {
    events.forEach(ev => {
      const partnerId = ev.user1Id === userId ? ev.user2Id : ev.user1Id;
      const partner = getUserById(data, partnerId);
      const partnerName = partner ? partner.nickName : 'Unknown';
      const evRatings = ratings.filter(r => r.eventId === ev.id);
      html += `
        <div class="event-card">
          <div class="event-header">
            <span class="event-date">${ev.date || 'Date unknown'}</span>
            <span class="event-partner">with ${escapeHtml(partnerName)}</span>
          </div>
          <div class="event-activity">${escapeHtml(ev.activity || '')}</div>
          ${ev.description ? `<p class="event-desc">${escapeHtml(ev.description)}</p>` : ''}
          ${(ev.media || []).length ? `<div class="event-media">${(ev.media || []).map(m => m.type === 'image' ? `<img src="${m.url}" alt="">` : m.type === 'video' ? `<video src="${m.url}" controls></video>` : '').join('')}</div>` : ''}
        </div>
      `;
    });
  }
  html += '</div>';

  html += `<h3>Ratings & Reviews</h3><div class="ratings-list" id="ratingsList">`;
  if (ratings.length === 0) html += '<p class="empty-item">No ratings yet.</p>';
  else {
    ratings.forEach(r => {
      const fromUser = getUserById(data, r.fromUserId);
      const fromName = fromUser ? fromUser.nickName : 'Anonymous';
      html += `
        <div class="rating-card">
          <div class="rating-header">
            <span class="rating-stars">${'&#9733;'.repeat(r.stars)}${'&#9734;'.repeat(5 - r.stars)}</span>
            <span class="rating-from">by ${escapeHtml(fromName)}</span>
          </div>
          <p class="rating-comment">${escapeHtml(r.comment || '')}</p>
        </div>
      `;
    });
  }
  html += '</div>';

  html += `<h3>Posts</h3><div class="posts-list" id="postsList">`;
  if (isOwnProfile) {
    html += `
      <div class="add-post-form">
        <textarea id="newPostText" placeholder="Write something..." rows="2"></textarea>
        <div class="post-media-input">
          <label class="file-btn">Add Image <input type="file" id="postImage" accept="image/*" hidden></label>
          <label class="file-btn">Add Video <input type="file" id="postVideo" accept="video/*" hidden></label>
        </div>
        <button type="button" class="btn btn-primary" id="addPostBtn">Post</button>
      </div>
    `;
  }
  if (posts.length === 0 && !isOwnProfile) html += '<p class="empty-item">No posts yet.</p>';
  posts.forEach(p => {
    if (p.type === 'text') html += `<div class="post-card"><p>${escapeHtml(p.content)}</p></div>`;
    else if (p.type === 'image') html += `<div class="post-card"><img src="${p.content}" alt=""><p>${escapeHtml(p.caption || '')}</p></div>`;
    else if (p.type === 'video') html += `<div class="post-card"><video src="${p.content}" controls></video><p>${escapeHtml(p.caption || '')}</p></div>`;
  });
  html += '</div>';

  if (isOwnProfile) {
    html += `
      <h3>Add Past Event</h3>
      <div class="add-event-form">
        <select id="eventPartner">
          <option value="">Select partner</option>
          ${data.users.filter(u => u.id !== current.id).map(u => `<option value="${u.id}">${escapeHtml(u.nickName)}</option>`).join('')}
        </select>
        <input type="date" id="eventDate" placeholder="Date">
        <input type="text" id="eventActivity" placeholder="Activity (e.g. #hiking #coffee)">
        <textarea id="eventDesc" placeholder="Description" rows="2"></textarea>
        <button type="button" class="btn btn-primary" id="addEventBtn">Add Event</button>
      </div>
    `;
  }

  container.innerHTML = html;

  if (canRate) {
    const linkEvent = events.find(e => e.user1Id === current.id || e.user2Id === current.id) || events[0];
    let selectedStars = 0;
    container.querySelectorAll('.star').forEach((s, i) => {
      s.addEventListener('click', () => { selectedStars = i + 1; container.querySelectorAll('.star').forEach((st, j) => st.classList.toggle('active', j < selectedStars)); });
    });
    container.querySelector('#submitRating').addEventListener('click', () => {
      const comment = container.querySelector('#ratingComment').value.trim();
      if (selectedStars === 0) { alert('Please select a star rating.'); return; }
      data.ratings.push({ id: 'r' + Date.now(), fromUserId: current.id, toUserId: userId, stars: selectedStars, comment, eventId: linkEvent?.id, createdAt: Date.now() });
      saveData(data);
      renderUserPage(userId);
    });
  }

  if (isOwnProfile) {
    container.querySelector('#addPostBtn')?.addEventListener('click', () => {
      const text = container.querySelector('#newPostText').value.trim();
      const imgInput = container.querySelector('#postImage');
      const vidInput = container.querySelector('#postVideo');
      let type = 'text', content = text;
      if (vidInput?.files?.[0]) {
        const r = new FileReader();
        r.onload = () => {
          data.posts.push({ id: 'p' + Date.now(), userId, type: 'video', content: r.result, caption: text, createdAt: Date.now() });
          saveData(data);
          renderUserPage(userId);
        };
        r.readAsDataURL(vidInput.files[0]);
        return;
      }
      if (imgInput?.files?.[0]) {
        const r = new FileReader();
        r.onload = () => {
          data.posts.push({ id: 'p' + Date.now(), userId, type: 'image', content: r.result, caption: text, createdAt: Date.now() });
          saveData(data);
          renderUserPage(userId);
        };
        r.readAsDataURL(imgInput.files[0]);
        return;
      }
      if (text) {
        data.posts.push({ id: 'p' + Date.now(), userId, type: 'text', content: text, createdAt: Date.now() });
        saveData(data);
        renderUserPage(userId);
      }
    });

    container.querySelector('#addEventBtn')?.addEventListener('click', () => {
      const partnerId = container.querySelector('#eventPartner').value;
      const date = container.querySelector('#eventDate').value;
      const activity = container.querySelector('#eventActivity').value.trim();
      const desc = container.querySelector('#eventDesc').value.trim();
      if (!partnerId || !date) { alert('Please select a partner and date.'); return; }
      data.events.push({ id: 'e' + Date.now(), user1Id: current.id, user2Id: partnerId, date, activity, description: desc, media: [], createdAt: Date.now() });
      saveData(data);
      renderUserPage(userId);
    });
  }
}

// --- Messaging ---
let currentChatUserId = null;

function openChat(userId) {
  const data = getData();
  const user = getUserById(data, userId);
  if (!user) return;
  
  currentChatUserId = userId;
  const modal = document.getElementById('chatModal');
  const partnerName = document.getElementById('chatPartnerName');
  const messagesEl = document.getElementById('chatMessages');
  
  partnerName.textContent = user.nickName || 'Anonymous';
  renderChatMessages(userId);
  modal.classList.add('active');
}

function renderChatMessages(userId) {
  const data = getData();
  const current = data.currentUser;
  if (!current) return;
  
  const messagesEl = document.getElementById('chatMessages');
  const messages = (data.messages || []).filter(m => 
    (m.fromUserId === current.id && m.toUserId === userId) ||
    (m.fromUserId === userId && m.toUserId === current.id)
  ).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  
  // Mark messages as read
  messages.forEach(m => {
    if (m.toUserId === current.id && !m.read) {
      m.read = true;
    }
  });
  saveData(data);
  
  messagesEl.innerHTML = messages.length === 0 
    ? '<p class="empty-item">No messages yet. Start the conversation!</p>'
    : messages.map(m => {
        const isMe = m.fromUserId === current.id;
        return `<div class="chat-message ${isMe ? 'chat-message-me' : ''}">
          <div class="chat-message-content">${escapeHtml(m.text)}</div>
          <div class="chat-message-time">${formatTime(m.createdAt)}</div>
        </div>`;
      }).join('');
  messagesEl.scrollTop = messagesEl.scrollHeight;
  updateBadges();
}

function sendMessage() {
  const data = getData();
  const current = data.currentUser;
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  
  if (!text || !current || !currentChatUserId) return;
  
  data.messages.push({
    id: 'm' + Date.now(),
    fromUserId: current.id,
    toUserId: currentChatUserId,
    text,
    createdAt: Date.now()
  });
  saveData(data);
  input.value = '';
  renderChatMessages(currentChatUserId);
  updateBadges();
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return d.toLocaleDateString();
}

// --- Requests ---
function showRequestDialog(user) {
  const data = getData();
  const current = data.currentUser;
  if (!current) return;
  
  // Check if already has pending request
  const existing = (data.requests || []).find(r => 
    r.fromUserId === current.id && r.toUserId === user.id && r.status === 'pending'
  );
  if (existing) {
    alert('You already have a pending request with this user.');
    return;
  }
  
  const date = prompt(`Request to go out with ${user.nickName}?\n\nEnter date (YYYY-MM-DD):`);
  if (!date) return;
  
  const activity = prompt('What activity? (e.g. #hiking #coffee):') || '';
  const message = prompt('Add a message (optional):') || '';
  
  data.requests = data.requests || [];
  data.requests.push({
    id: 'req' + Date.now(),
    fromUserId: current.id,
    toUserId: user.id,
    date,
    activity,
    message,
    status: 'pending',
    createdAt: Date.now()
  });
  saveData(data);
  alert('Request sent! They will see it in their notifications.');
  updateBadges();
}

function getRequestsForUser(data, userId) {
  return (data.requests || []).filter(r => r.toUserId === userId && r.status === 'pending');
}

function acceptRequest(requestId) {
  const data = getData();
  const request = data.requests.find(r => r.id === requestId);
  if (!request) return;
  
  request.status = 'accepted';
  data.plans = data.plans || [];
  data.plans.push({
    id: 'plan' + Date.now(),
    user1Id: request.fromUserId,
    user2Id: request.toUserId,
    date: request.date,
    activity: request.activity,
    createdAt: Date.now()
  });
  saveData(data);
  alert('Request accepted! Plan added to your notifications.');
  renderNotifications();
  updateBadges();
}

function declineRequest(requestId) {
  const data = getData();
  const request = data.requests.find(r => r.id === requestId);
  if (!request) return;
  
  if (!confirm('Decline this request?')) return;
  
  request.status = 'declined';
  saveData(data);
  renderNotifications();
  updateBadges();
}

// --- Notifications ---
function renderNotifications() {
  const data = getData();
  const current = data.currentUser;
  const container = document.getElementById('notificationsList');
  if (!container || !current) return;
  
  const requests = getRequestsForUser(data, current.id);
  const plans = (data.plans || []).filter(p => 
    (p.user1Id === current.id || p.user2Id === current.id) &&
    new Date(p.date) >= new Date()
  ).sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let html = '';
  
  if (requests.length > 0) {
    html += '<h3>Pending Requests</h3>';
    requests.forEach(req => {
      const fromUser = getUserById(data, req.fromUserId);
      html += `
        <div class="notification-card">
          <div class="notification-header">
            <strong>${escapeHtml(fromUser?.nickName || 'Someone')}</strong> wants to go out with you
          </div>
          <div class="notification-content">
            <p>Date: ${req.date}</p>
            ${req.activity ? `<p>Activity: ${escapeHtml(req.activity)}</p>` : ''}
            ${req.message ? `<p>Message: ${escapeHtml(req.message)}</p>` : ''}
          </div>
          <div class="notification-actions">
            <button type="button" class="btn btn-sm btn-primary" onclick="acceptRequest('${req.id}')">Accept</button>
            <button type="button" class="btn btn-sm btn-secondary" onclick="declineRequest('${req.id}')">Decline</button>
          </div>
        </div>
      `;
    });
  }
  
  if (plans.length > 0) {
    html += '<h3>Upcoming Plans</h3>';
    plans.forEach(plan => {
      const partnerId = plan.user1Id === current.id ? plan.user2Id : plan.user1Id;
      const partner = getUserById(data, partnerId);
      const planDate = new Date(plan.date);
      const daysUntil = Math.ceil((planDate - new Date()) / (1000 * 60 * 60 * 24));
      html += `
        <div class="notification-card notification-plan">
          <div class="notification-header">
            <strong>Plan with ${escapeHtml(partner?.nickName || 'Partner')}</strong>
            ${daysUntil === 0 ? '<span class="plan-today">Today!</span>' : daysUntil === 1 ? '<span class="plan-tomorrow">Tomorrow</span>' : `<span class="plan-days">${daysUntil} days</span>`}
          </div>
          <div class="notification-content">
            <p>Date: ${plan.date}</p>
            ${plan.activity ? `<p>Activity: ${escapeHtml(plan.activity)}</p>` : ''}
          </div>
        </div>
      `;
    });
  }
  
  if (requests.length === 0 && plans.length === 0) {
    html = '<p class="empty-item">No notifications or upcoming plans.</p>';
  }
  
  container.innerHTML = html;
}

function renderMessages() {
  const data = getData();
  const current = data.currentUser;
  const container = document.getElementById('messagesList');
  if (!container || !current) return;
  
  const conversations = {};
  (data.messages || []).forEach(m => {
    const otherId = m.fromUserId === current.id ? m.toUserId : m.fromUserId;
    if (!conversations[otherId]) {
      conversations[otherId] = {
        user: getUserById(data, otherId),
        lastMessage: m,
        unread: m.toUserId === current.id && !m.read
      };
    } else {
      if ((m.createdAt || 0) > (conversations[otherId].lastMessage.createdAt || 0)) {
        conversations[otherId].lastMessage = m;
      }
      if (m.toUserId === current.id && !m.read) {
        conversations[otherId].unread = true;
      }
    }
  });
  
  const convs = Object.values(conversations).sort((a, b) => 
    (b.lastMessage.createdAt || 0) - (a.lastMessage.createdAt || 0)
  );
  
  if (convs.length === 0) {
    container.innerHTML = '<p class="empty-item">No messages yet. Start chatting with your matches!</p>';
    return;
  }
  
  container.innerHTML = convs.map(conv => {
    const user = conv.user;
    return `
      <div class="message-conversation" onclick="openChat('${user.id}')">
        <div class="user-avatar">${(user.nickName || '?')[0]}</div>
        <div class="conversation-info">
          <div class="conversation-header">
            <strong>${escapeHtml(user.nickName || 'Anonymous')}</strong>
            ${conv.unread ? '<span class="unread-badge">New</span>' : ''}
          </div>
          <div class="conversation-preview">${escapeHtml(conv.lastMessage.text)}</div>
          <div class="conversation-time">${formatTime(conv.lastMessage.createdAt)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function updateBadges() {
  const data = getData();
  const current = data.currentUser;
  if (!current) return;
  
  // const unreadMessages = (data.messages || []).filter(m => 
    m.toUserId === current.id && !m.read
  ).length;
  
  const pendingRequests = getRequestsForUser(data, current.id).length;
  
  const messageBadge = document.getElementById('messageBadge');
  const notificationBadge = document.getElementById('notificationBadge');
  
  if (messageBadge) {
    messageBadge.textContent = unreadMessages;
    messageBadge.style.display = unreadMessages > 0 ? 'inline-block' : 'none';
  }
  
  if (notificationBadge) {
    notificationBadge.textContent = pendingRequests;
    notificationBadge.style.display = pendingRequests > 0 ? 'inline-block' : 'none';
  }
}

// Make functions global for onclick handlers
window.acceptRequest = acceptRequest;
window.declineRequest = declineRequest;
window.openChat = openChat;

// --- Routing ---
function handleRoute() {
  const hash = window.location.hash.slice(1) || 'home';
  const parts = hash.split('/');
  const sectionId = parts[0];
  const userId = parts[1];

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  if (sectionId === 'user' && userId) {
    document.getElementById('user-page').classList.add('active');
    renderUserPage(userId);
  } else {
    const section = document.getElementById(sectionId || 'home');
    if (section) section.classList.add('active');
    const link = document.querySelector(`.nav-link[href="#${sectionId || 'home'}"]`);
    if (link) link.classList.add('active');
    
    if (sectionId === 'messages') renderMessages();
    if (sectionId === 'notifications') renderNotifications();
  }
}

function goToUser(user) {
  window.location.hash = 'user/' + user.id;
  handleRoute();
}

// --- Init ---
function init() {
  const data = getData();

  document.getElementById('calPrev').addEventListener('click', () => { calMonth = (calMonth || new Date().getMonth() + 1) - 1; if (calMonth < 1) { calMonth = 12; calYear = (calYear || new Date().getFullYear()) - 1; } renderCalendar(); });
  document.getElementById('calNext').addEventListener('click', () => { calMonth = (calMonth || new Date().getMonth() + 1) + 1; if (calMonth > 12) { calMonth = 1; calYear = (calYear || new Date().getFullYear()) + 1; } renderCalendar(); });

  const nickInput = document.getElementById('nickName');
  const saveBtn = document.getElementById('saveProfile');
  const timeSelect = document.getElementById('scheduleTime');

  if (data.currentUser) {
    nickInput.value = data.currentUser.nickName || '';
    document.getElementById('bio').value = data.currentUser.bio || '';
    selectedSlots = (data.currentUser.availability || []).map(a => ({ ...a, year: a.year || new Date().getFullYear() }));
    initHashtagInput(data.currentUser.hashtags || []);
  } else {
    initHashtagInput([]);
  }

  renderCalendar();
  renderSelectedSlots();

  saveBtn.addEventListener('click', () => {
    const nick = nickInput.value.trim() || 'Anonymous';
    const bio = document.getElementById('bio').value.trim();
    const hashtags = [...new Set(selectedHashtags)];
    const availability = selectedSlots.map(s => ({ year: s.year, month: s.month, day: s.day, time: timeSelect?.value || 'flexible' }));

    let current = data.currentUser;
    if (!current) {
      current = { id: 'u' + Date.now(), nickName: nick, bio, hashtags, availability };
      data.users.push(current);
    } else {
      current.nickName = nick;
      current.bio = bio;
      current.hashtags = hashtags;
      current.availability = availability;
    }
    data.currentUser = current;
    saveData(data);

    selectedSlots = availability.map(a => ({ ...a, year: a.year || new Date().getFullYear() }));
    renderBrowse(data.users, current.id);
    renderMatch(data);
    alert('Profile saved!');
  });

  function renderBrowse(users, currentId) {
    const container = document.getElementById('userCards');
    if (!container) return;
    container.innerHTML = '';
    (users || []).filter(u => u.id !== currentId).forEach(u => {
      container.appendChild(renderUserCard(u, false, goToUser));
    });
  }

  function renderMatch(data) {
    const container = document.getElementById('matchCards');
    const empty = document.getElementById('matchEmpty');
    if (!container) return;
    const recs = getRecommendations(data);
    container.innerHTML = '';
    if (recs.length === 0) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    recs.forEach(({ user, score }) => container.appendChild(renderUserCard(user, score, (u) => goToUser(u), true)));
  }

  renderBrowse(data.users, data.currentUser?.id);
  renderMatch(data);

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); window.location.hash = link.getAttribute('href').slice(1); handleRoute(); });
  });
  document.querySelector('.logo').addEventListener('click', e => { e.preventDefault(); window.location.hash = 'home'; handleRoute(); });

  // Chat modal close
  const chatModal = document.getElementById('chatModal');
  chatModal.querySelector('.modal-backdrop').addEventListener('click', () => chatModal.classList.remove('active'));
  chatModal.querySelector('.modal-close').addEventListener('click', () => chatModal.classList.remove('active'));
  
  // Send message
  document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
  document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
  updateBadges();
}

init();


