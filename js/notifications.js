// ============================================================
// Shared Live Campus Notifications Module
// Provides realtime notification synchronization from Firestore
// for Student, Parent, Staff, and Admin portals.
// ============================================================
import { collection, query, orderBy, onSnapshot } from './auth.js';

export function initLiveNotifications({ role = 'student', db, switchTab }) {
  const notifBellBtn = document.getElementById('notifBellBtn');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifList = document.getElementById('notifList');
  const notifCountBadge = document.getElementById('notifCountBadge');
  const closeNotifDropdownBtn = document.getElementById('closeNotifDropdownBtn');
  const viewAllAnnouncementsBtn = document.getElementById('viewAllAnnouncementsBtn');
  const notifBellDot = notifBellBtn ? notifBellBtn.querySelector('.dot') : null;

  if (!notifBellBtn || !notifDropdown) return;

  function closeNotificationDropdown() {
    if (notifDropdown) notifDropdown.classList.remove('show');
  }

  function openNotificationDropdown() {
    if (!notifDropdown) return;
    notifDropdown.classList.add('show');
    if (notifBellDot) notifBellDot.style.display = 'none';
  }

  notifBellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (notifDropdown.classList.contains('show')) {
      closeNotificationDropdown();
    } else {
      openNotificationDropdown();
    }
  });

  // Close when clicking outside of the dropdown
  document.addEventListener('click', (e) => {
    if (notifDropdown.classList.contains('show')) {
      if (!notifDropdown.contains(e.target) && e.target !== notifBellBtn && !notifBellBtn.contains(e.target)) {
        closeNotificationDropdown();
      }
    }
  });

  // Close on Escape key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && notifDropdown.classList.contains('show')) {
      closeNotificationDropdown();
    }
  });

  if (closeNotifDropdownBtn) {
    closeNotifDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeNotificationDropdown();
    });
  }

  if (viewAllAnnouncementsBtn) {
    viewAllAnnouncementsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeNotificationDropdown();
      if (typeof switchTab === 'function') {
        switchTab('announcements');
      }
    });
  }

  function filterByRole(ann) {
    const aud = ann.targetAudience;
    if (role === 'admin') return true;
    if (role === 'staff') {
      return !aud || aud === 'teachers' || aud === 'all' || aud === 'students_parents';
    }
    if (role === 'student') {
      return aud !== 'teachers';
    }
    if (role === 'parent') {
      return aud !== 'teachers' && aud !== 'students';
    }
    return true;
  }

  function renderLiveNotifications(rawItems) {
    if (!notifList || !notifCountBadge) return;

    const items = rawItems.filter(filterByRole);
    const count = items.length;

    if (count === 0) {
      notifCountBadge.textContent = '0 Active';
      notifCountBadge.className = 'badge badge-outline';
      if (notifBellDot) notifBellDot.style.display = 'none';

      notifList.innerHTML = `
        <div style="text-align:center; padding:28px 14px; color:var(--ink-soft); font-size:12.5px;">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 8px auto; opacity:0.4; display:block;">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <strong style="display:block; color:var(--ink); margin-bottom:2px;">No Notifications Uploaded</strong>
          <span>School announcements and updates will appear here in real-time.</span>
        </div>
      `;
      return;
    }

    notifCountBadge.textContent = `${count} Active`;
    notifCountBadge.className = 'badge badge-good';
    if (notifBellDot && !notifDropdown.classList.contains('show')) {
      notifBellDot.style.display = 'block';
    }

    notifList.innerHTML = items.slice(0, 10).map(ann => {
      let dateStr = 'Recent';
      if (ann.createdAt?.toDate) {
        const d = ann.createdAt.toDate();
        dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      }

      let badgeHtml = '<span class="badge badge-purple" style="font-size:10px; padding:1px 6px;">Schoolwide</span>';
      if (ann.targetAudience === 'teachers') {
        badgeHtml = '<span class="badge badge-good" style="font-size:10px; padding:1px 6px;">Staff Only</span>';
      } else if (ann.targetAudience === 'students_parents') {
        badgeHtml = '<span class="badge badge-navy" style="font-size:10px; padding:1px 6px;">Students &amp; Parents</span>';
      } else if (ann.targetAudience === 'students') {
        badgeHtml = '<span class="badge badge-yellow" style="font-size:10px; padding:1px 6px;">Students Only</span>';
      }

      const safeTitle = (ann.title || 'Campus Announcement').replace(/[<>&"]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[s]));
      const safeMsg = (ann.message || '').replace(/[<>&"]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[s]));

      return `
        <div class="notif-item" data-id="${ann.id || ''}" title="Click to view in Announcements">
          <div class="notif-item-header">
            <span class="notif-item-title">${safeTitle}</span>
            <span class="notif-item-time">${dateStr}</span>
          </div>
          <div class="notif-item-msg">${safeMsg}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:3px;">
            ${badgeHtml}
            <span style="font-size:11px; color:var(--brand-green); font-weight:700;">Open &rarr;</span>
          </div>
        </div>
      `;
    }).join('');

    notifList.querySelectorAll('.notif-item').forEach(itemEl => {
      itemEl.addEventListener('click', () => {
        closeNotificationDropdown();
        if (notifBellDot) notifBellDot.style.display = 'none';
        if (typeof switchTab === 'function') {
          switchTab('announcements');
        }
      });
    });
  }

  // Realtime Firestore listener for live notifications
  try {
    const annCol = collection(db, 'announcements');
    const q = query(annCol, orderBy('createdAt', 'desc'));
    onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderLiveNotifications(items);
    }, (err) => {
      console.warn('Ordered announcements onSnapshot notice, falling back to unordered listener:', err);
      onSnapshot(annCol, (fallbackSnap) => {
        const fallbackItems = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        fallbackItems.sort((a, b) => {
          const ta = a.createdAt?.seconds || 0;
          const tb = b.createdAt?.seconds || 0;
          return tb - ta;
        });
        renderLiveNotifications(fallbackItems);
      }, (fallbackErr) => {
        console.error('Announcements onSnapshot fallback failed:', fallbackErr);
      });
    });
  } catch (e) {
    console.error('Error setting up realtime announcements listener:', e);
  }
}
