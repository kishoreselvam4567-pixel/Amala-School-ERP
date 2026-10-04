// =========================================================================
// UNIFIED SCHOOL ACADEMIC & EVENTS CALENDAR MODULE
// Used across Admin, Staff, Student, and Parent portals.
// Role-based permissions:
//   - ADMIN: Full CRUD (Create, Edit, Reschedule, Delete)
//   - STAFF, STUDENT, PARENT: View-Only (Read-Only)
// =========================================================================

import { 
  collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, 
  orderBy, serverTimestamp, db 
} from './auth.js';

// Pre-defined event categories with color palettes & icons
export const CALENDAR_CATEGORIES = {
  academic: { key: 'academic', label: 'Academic & Term', icon: '📘', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  exam: { key: 'exam', label: 'Exams & Tests', icon: '📝', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  holiday: { key: 'holiday', label: 'Holidays & Vacations', icon: '🏖️', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  meeting: { key: 'meeting', label: 'Meetings & PTM', icon: '👥', bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  sports: { key: 'sports', label: 'Sports & Cultural', icon: '🏆', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  celebration: { key: 'celebration', label: 'Celebrations & Events', icon: '🎉', bg: '#fefce8', color: '#a16207', border: '#fef08a' }
};

// Realistic initial sample events if repository is empty
export const SAMPLE_CALENDAR_EVENTS = [
  {
    title: 'Term-1 Mid-Term Examinations',
    description: 'Comprehensive mid-term assessments across all subjects for Standard 1 to 12.',
    category: 'exam',
    startDate: '2026-10-12',
    endDate: '2026-10-20',
    startTime: '09:30',
    endTime: '12:30',
    isAllDay: false,
    location: 'Assigned Examination Halls',
    targetAudience: 'students'
  },
  {
    title: 'Parent-Teacher Meeting (Term-1 Review)',
    description: 'One-on-one academic performance review with class teachers and subject faculty.',
    category: 'meeting',
    startDate: '2026-10-24',
    endDate: '2026-10-24',
    startTime: '09:00',
    endTime: '13:00',
    isAllDay: false,
    location: 'Main School Auditorium & Classrooms',
    targetAudience: 'parents'
  },
  {
    title: 'Ayutha Pooja & Vijaya Dasami Holidays',
    description: 'School campus closed for traditional festival celebrations.',
    category: 'holiday',
    startDate: '2026-10-19',
    endDate: '2026-10-21',
    isAllDay: true,
    location: 'Campus Closed',
    targetAudience: 'all'
  },
  {
    title: 'Annual Inter-School Athletic Meet 2026',
    description: 'Track and field events, marching contingent displays, and championship trophy presentations.',
    category: 'sports',
    startDate: '2026-10-28',
    endDate: '2026-10-29',
    startTime: '08:30',
    endTime: '16:00',
    isAllDay: false,
    location: 'Amala Sports Arena & Stadium',
    targetAudience: 'all'
  },
  {
    title: 'Deepavali Festival Vacation',
    description: 'Festival of Lights holidays for all students and faculty members.',
    category: 'holiday',
    startDate: '2026-11-08',
    endDate: '2026-11-11',
    isAllDay: true,
    location: 'Campus Closed',
    targetAudience: 'all'
  },
  {
    title: 'Science & Innovation Exhibition 2026',
    description: 'Student project showcase featuring STEM robotics, working science models, and art presentations.',
    category: 'academic',
    startDate: '2026-11-14',
    endDate: '2026-11-14',
    startTime: '09:00',
    endTime: '15:30',
    location: 'Science Block Laboratories & Hall',
    targetAudience: 'all'
  },
  {
    title: 'Children\'s Day Special Assembly',
    description: 'Special morning assembly, cultural performances by faculty, and games for students.',
    category: 'celebration',
    startDate: '2026-11-14',
    endDate: '2026-11-14',
    startTime: '08:30',
    endTime: '11:00',
    location: 'Central Courtyard',
    targetAudience: 'students'
  },
  {
    title: 'Half-Yearly Examination Timetable',
    description: 'Official semester examinations for all grades. Mandatory attendance.',
    category: 'exam',
    startDate: '2026-12-14',
    endDate: '2026-12-23',
    startTime: '09:30',
    endTime: '12:30',
    location: 'Assigned Examination Halls',
    targetAudience: 'students'
  }
];

class SchoolCalendar {
  constructor(options) {
    this.containerId = options.containerId || 'schoolCalendarModuleWrap';
    this.role = (options.role || 'student').toLowerCase();
    this.isAdmin = this.role === 'admin';
    this.events = [];
    this.currentDate = new Date(); // Active viewing month/year
    this.viewMode = 'grid'; // 'grid' | 'agenda'
    this.filterCategory = 'all';
    this.filterAudience = 'all';
    this.searchQuery = '';
    this.activeModalEvent = null;

    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.warn(`Calendar container #${this.containerId} not found.`);
      return;
    }

    this.init();
  }

  async init() {
    this.renderSkeleton();
    await this.loadEvents();
    this.attachEventListeners();
    this.render();
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="cal-wrap">
        <!-- TOP TOOLBAR -->
        <div class="cal-toolbar">
          <div class="cal-toolbar-left">
            <div class="cal-title-row">
              <span class="cal-icon-badge">📅</span>
              <div>
                <h3 class="cal-main-title">School Academic &amp; Events Calendar</h3>
                <p class="cal-sub-title">Official examination schedules, holidays, academic milestones &amp; campus events</p>
              </div>
            </div>
          </div>
          <div class="cal-toolbar-right">
            ${this.isAdmin ? `
              <button type="button" class="btn btn-primary cal-add-event-btn" id="calAddEventBtn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>+ Add Event</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- CONTROLS & NAV BAR -->
        <div class="cal-nav-bar">
          <div class="cal-nav-controls">
            <button type="button" class="cal-btn-nav" id="calPrevMonthBtn" title="Previous Month">&lsaquo;</button>
            <button type="button" class="cal-btn-today" id="calTodayBtn">Today</button>
            <button type="button" class="cal-btn-nav" id="calNextMonthBtn" title="Next Month">&rsaquo;</button>
            <h4 class="cal-current-month-heading" id="calCurrentMonthHeading">—</h4>
          </div>

          <div class="cal-filter-and-views">
            <!-- View Mode Switcher -->
            <div class="cal-view-toggles">
              <button type="button" class="cal-view-tab active" data-view="grid" id="calViewGridBtn">📅 Grid</button>
              <button type="button" class="cal-view-tab" data-view="agenda" id="calViewAgendaBtn">📋 Agenda</button>
            </div>
          </div>
        </div>

        <!-- CATEGORY CHIPS BAR -->
        <div class="cal-chips-bar" id="calChipsBar">
          <button type="button" class="cal-chip active" data-cat="all">All Events</button>
          <button type="button" class="cal-chip chip-exam" data-cat="exam">📝 Exams</button>
          <button type="button" class="cal-chip chip-holiday" data-cat="holiday">🏖️ Holidays</button>
          <button type="button" class="cal-chip chip-academic" data-cat="academic">📘 Academic</button>
          <button type="button" class="cal-chip chip-meeting" data-cat="meeting">👥 Meetings &amp; PTM</button>
          <button type="button" class="cal-chip chip-sports" data-cat="sports">🏆 Sports &amp; Cultural</button>
          <button type="button" class="cal-chip chip-celebration" data-cat="celebration">🎉 Celebrations</button>
        </div>

        <!-- BODY WRAPPER (Switches between Month Grid & Agenda List) -->
        <div class="cal-body-container" id="calBodyContainer">
          <div class="cal-loading-placeholder">Loading school calendar events…</div>
        </div>
      </div>

      <!-- EVENT DETAILS MODAL (Shared by all roles) -->
      <div class="cal-modal-overlay" id="calEventDetailsModal" style="display:none;">
        <div class="cal-modal-card">
          <button type="button" class="cal-modal-close" id="calCloseDetailsModal">&times;</button>
          <div class="cal-modal-header" id="calDetailsHeader">
            <span class="cal-modal-cat-badge" id="calDetailsCatBadge">Academic</span>
            <h3 class="cal-modal-title" id="calDetailsTitle">Event Title</h3>
            <p class="cal-modal-subtitle" id="calDetailsTime">Time &amp; Date</p>
          </div>
          <div class="cal-modal-body">
            <div class="cal-detail-item">
              <span class="cal-detail-label">📍 Venue / Location:</span>
              <span class="cal-detail-val" id="calDetailsLocation">—</span>
            </div>
            <div class="cal-detail-item">
              <span class="cal-detail-label">👥 Target Audience:</span>
              <span class="cal-detail-val" id="calDetailsAudience">All School Community</span>
            </div>
            <div class="cal-detail-item" style="display:block; margin-top:12px;">
              <span class="cal-detail-label">📝 Description &amp; Instructions:</span>
              <p class="cal-detail-desc" id="calDetailsDesc">No additional details provided.</p>
            </div>
          </div>
          <div class="cal-modal-footer" id="calDetailsFooter">
            ${this.isAdmin ? `
              <button type="button" class="btn btn-danger btn-sm" id="calDeleteEventBtn">Delete</button>
              <button type="button" class="btn btn-primary btn-sm" id="calEditEventBtn">Edit / Reschedule</button>
            ` : ''}
            <button type="button" class="btn btn-outline btn-sm" id="calCloseDetailsBtn">Close</button>
          </div>
        </div>
      </div>

      <!-- ADMIN ADD / EDIT EVENT MODAL -->
      ${this.isAdmin ? `
        <div class="cal-modal-overlay" id="calAddEditModal" style="display:none;">
          <div class="cal-modal-card" style="max-width:540px;">
            <button type="button" class="cal-modal-close" id="calCloseAddEditModal">&times;</button>
            <div class="cal-modal-header">
              <h3 class="cal-modal-title" id="calAddEditModalTitle">+ Add Calendar Event</h3>
              <p class="cal-modal-subtitle">Publish examination dates, holidays, sports or meetings</p>
            </div>
            <form id="calAddEditForm" onsubmit="return false;">
              <input type="hidden" id="calEventId">
              <div class="cal-form-group">
                <label>Event Title <span style="color:#ef4444;">*</span></label>
                <input type="text" id="calEventTitleInput" required placeholder="e.g. Annual Sports Day 2026" class="cal-input">
              </div>

              <div class="cal-form-row">
                <div class="cal-form-group" style="flex:1;">
                  <label>Category <span style="color:#ef4444;">*</span></label>
                  <select id="calEventCategorySelect" class="cal-input" required>
                    <option value="academic">📘 Academic &amp; Term</option>
                    <option value="exam">📝 Exams &amp; Assessments</option>
                    <option value="holiday">🏖️ Holiday / Vacation</option>
                    <option value="meeting">👥 Meeting &amp; PTM</option>
                    <option value="sports">🏆 Sports &amp; Cultural</option>
                    <option value="celebration">🎉 Celebrations &amp; Fest</option>
                  </select>
                </div>
                <div class="cal-form-group" style="flex:1;">
                  <label>Target Audience</label>
                  <select id="calEventAudienceSelect" class="cal-input">
                    <option value="all">👥 All School Community</option>
                    <option value="students">🎓 Students Only</option>
                    <option value="staff">👨‍🏫 Faculty &amp; Staff Only</option>
                    <option value="parents">👨‍👩‍👧 Parents Only</option>
                  </select>
                </div>
              </div>

              <div class="cal-form-row">
                <div class="cal-form-group" style="flex:1;">
                  <label>Start Date <span style="color:#ef4444;">*</span></label>
                  <input type="date" id="calEventStartDateInput" required class="cal-input">
                </div>
                <div class="cal-form-group" style="flex:1;">
                  <label>End Date <span style="font-size:11px; color:#64748b;">(Optional)</span></label>
                  <input type="date" id="calEventEndDateInput" class="cal-input">
                </div>
              </div>

              <div class="cal-form-group" style="margin-bottom:8px;">
                <label style="display:inline-flex; align-items:center; gap:8px; cursor:pointer; font-weight:600;">
                  <input type="checkbox" id="calEventAllDayCheck" style="width:16px; height:16px;">
                  <span>All-Day Event (No specific timing)</span>
                </label>
              </div>

              <div class="cal-form-row" id="calTimeRow">
                <div class="cal-form-group" style="flex:1;">
                  <label>Start Time</label>
                  <input type="time" id="calEventStartTimeInput" class="cal-input" value="09:00">
                </div>
                <div class="cal-form-group" style="flex:1;">
                  <label>End Time</label>
                  <input type="time" id="calEventEndTimeInput" class="cal-input" value="13:00">
                </div>
              </div>

              <div class="cal-form-group">
                <label>Venue / Location</label>
                <input type="text" id="calEventLocationInput" placeholder="e.g. Main Auditorium / Sports Ground" class="cal-input">
              </div>

              <div class="cal-form-group">
                <label>Description &amp; Specific Instructions</label>
                <textarea id="calEventDescInput" rows="3" placeholder="Enter full details, agenda or dress code..." class="cal-input" style="resize:vertical;"></textarea>
              </div>

              <div class="cal-modal-footer">
                <button type="button" class="btn btn-outline" id="calCancelAddEditBtn">Cancel</button>
                <button type="submit" class="btn btn-primary" id="calSaveEventBtn">Save &amp; Publish</button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}
    `;

    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('schoolCalendarStyles')) return;
    const style = document.createElement('style');
    style.id = 'schoolCalendarStyles';
    style.textContent = `
      .cal-wrap {
        background: #ffffff;
        border: 1px solid var(--line, #e2e8f0);
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04);
        margin-bottom: 24px;
        font-family: inherit;
      }
      .cal-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--line, #e2e8f0);
      }
      .cal-title-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .cal-icon-badge {
        font-size: 26px;
        line-height: 1;
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .cal-main-title {
        margin: 0;
        font-size: 19px;
        font-weight: 800;
        color: var(--ink, #0f172a);
      }
      .cal-sub-title {
        margin: 2px 0 0 0;
        font-size: 12.5px;
        color: var(--ink-soft, #64748b);
      }
      .cal-add-event-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        padding: 9px 18px;
        border-radius: 10px;
        cursor: pointer;
      }

      /* NAV BAR */
      .cal-nav-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
      }
      .cal-nav-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .cal-btn-nav {
        width: 34px;
        height: 34px;
        border: 1px solid var(--line, #cbd5e1);
        background: #fff;
        border-radius: 8px;
        font-size: 20px;
        font-weight: bold;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .cal-btn-nav:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
      }
      .cal-btn-today {
        height: 34px;
        padding: 0 14px;
        border: 1px solid var(--line, #cbd5e1);
        background: #fff;
        border-radius: 8px;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .cal-btn-today:hover {
        background: #f1f5f9;
      }
      .cal-current-month-heading {
        margin: 0 0 0 12px;
        font-size: 17px;
        font-weight: 800;
        color: var(--ink, #0f172a);
      }

      /* VIEW TOGGLES */
      .cal-view-toggles {
        display: flex;
        background: #f1f5f9;
        border-radius: 8px;
        padding: 3px;
        gap: 4px;
      }
      .cal-view-tab {
        border: none;
        background: transparent;
        font-size: 12px;
        font-weight: 700;
        color: #64748b;
        padding: 6px 14px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .cal-view-tab.active {
        background: #ffffff;
        color: var(--ink, #0f172a);
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      }

      /* CHIPS BAR */
      .cal-chips-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 12px;
        margin-bottom: 16px;
        scrollbar-width: thin;
      }
      .cal-chip {
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        color: #475569;
        font-size: 12px;
        font-weight: 600;
        padding: 6px 14px;
        border-radius: 20px;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s ease;
      }
      .cal-chip:hover {
        background: #f1f5f9;
      }
      .cal-chip.active {
        background: var(--ink, #0f172a);
        color: #ffffff;
        border-color: var(--ink, #0f172a);
      }

      /* MONTH GRID VIEW */
      .cal-grid-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
      }
      .cal-grid-header th {
        background: #f8fafc;
        padding: 10px 4px;
        font-size: 11.5px;
        font-weight: 700;
        color: #64748b;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid #e2e8f0;
      }
      .cal-grid-cell {
        height: 108px;
        vertical-align: top;
        padding: 6px;
        border: 1px solid #f1f5f9;
        position: relative;
        background: #fff;
        transition: background 0.12s ease;
      }
      .cal-grid-cell:hover {
        background: #fcfdfe;
      }
      .cal-grid-cell.cell-dimmed {
        background: #fafafa;
        color: #94a3b8;
      }
      .cal-grid-cell.cell-today {
        background: #f0fdf4;
        border-color: #bbf7d0;
      }
      .cal-cell-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .cal-day-num {
        font-size: 12px;
        font-weight: 700;
        color: #334155;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }
      .cell-today .cal-day-num {
        background: var(--brand-green, #16a34a);
        color: #ffffff;
      }
      .cal-cell-add-btn {
        opacity: 0;
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-weight: 900;
        font-size: 14px;
        line-height: 1;
        padding: 0 4px;
        transition: opacity 0.15s ease;
      }
      .cal-grid-cell:hover .cal-cell-add-btn {
        opacity: 1;
      }
      .cal-cell-add-btn:hover {
        color: var(--brand-green, #16a34a);
      }

      /* EVENT PILLS ON GRID */
      .cal-event-pill {
        display: block;
        margin-bottom: 3px;
        padding: 3px 6px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
        border: 1px solid transparent;
        transition: transform 0.1s ease, box-shadow 0.1s ease;
      }
      .cal-event-pill:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.06);
      }
      .cal-pill-exam { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
      .cal-pill-holiday { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
      .cal-pill-academic { background: #eff6ff; color: #1e40af; border-color: #bfdbfe; }
      .cal-pill-meeting { background: #faf5ff; color: #6b21a8; border-color: #e9d5ff; }
      .cal-pill-sports { background: #fff7ed; color: #9a3412; border-color: #fed7aa; }
      .cal-pill-celebration { background: #fefce8; color: #854d0e; border-color: #fef08a; }

      .cal-more-pill {
        font-size: 10.5px;
        font-weight: 700;
        color: #64748b;
        cursor: pointer;
        padding: 1px 4px;
      }
      .cal-more-pill:hover {
        color: var(--brand-green, #16a34a);
      }

      /* AGENDA / LIST VIEW */
      .cal-agenda-wrap {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .cal-agenda-card {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 20px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        transition: all 0.15s ease;
      }
      .cal-agenda-card:hover {
        border-color: #cbd5e1;
        box-shadow: 0 4px 12px -2px rgba(15,23,42,0.05);
      }
      .cal-agenda-left {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        flex: 1;
      }
      .cal-agenda-date-box {
        width: 54px;
        height: 58px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .cal-date-month {
        font-size: 10.5px;
        font-weight: 800;
        color: #dc2626;
        text-transform: uppercase;
      }
      .cal-date-day {
        font-size: 20px;
        font-weight: 900;
        color: #0f172a;
        line-height: 1;
      }
      .cal-agenda-content h4 {
        margin: 0 0 4px 0;
        font-size: 15px;
        font-weight: 700;
        color: #0f172a;
      }
      .cal-agenda-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 12px;
        color: #64748b;
        margin-bottom: 6px;
      }
      .cal-agenda-desc {
        margin: 0;
        font-size: 13px;
        color: #475569;
        line-height: 1.4;
      }
      .cal-agenda-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      /* MODALS */
      .cal-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(4px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .cal-modal-card {
        background: #ffffff;
        border-radius: 16px;
        width: 100%;
        max-width: 500px;
        box-shadow: 0 20px 40px -8px rgba(0,0,0,0.25);
        padding: 24px;
        position: relative;
        max-height: 90vh;
        overflow-y: auto;
      }
      .cal-modal-close {
        position: absolute;
        top: 18px;
        right: 18px;
        background: none;
        border: none;
        font-size: 24px;
        line-height: 1;
        color: #94a3b8;
        cursor: pointer;
      }
      .cal-modal-close:hover {
        color: #0f172a;
      }
      .cal-modal-header {
        margin-bottom: 18px;
        padding-bottom: 12px;
        border-bottom: 1px solid #f1f5f9;
      }
      .cal-modal-title {
        margin: 6px 0 2px 0;
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
      }
      .cal-modal-subtitle {
        margin: 0;
        font-size: 12.5px;
        color: #64748b;
      }
      .cal-modal-cat-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .cal-detail-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        margin-bottom: 8px;
      }
      .cal-detail-label {
        font-weight: 700;
        color: #64748b;
      }
      .cal-detail-val {
        color: #0f172a;
        font-weight: 600;
      }
      .cal-detail-desc {
        background: #f8fafc;
        border: 1px solid #f1f5f9;
        border-radius: 8px;
        padding: 12px;
        font-size: 13px;
        color: #334155;
        line-height: 1.5;
        margin-top: 6px;
      }
      .cal-modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #f1f5f9;
      }

      /* FORM INPUTS */
      .cal-form-group {
        margin-bottom: 12px;
      }
      .cal-form-group label {
        display: block;
        font-size: 12px;
        font-weight: 700;
        color: #334155;
        margin-bottom: 4px;
      }
      .cal-input {
        width: 100%;
        padding: 8px 12px;
        border: 1.5px solid #cbd5e1;
        border-radius: 8px;
        font-size: 13px;
        color: #0f172a;
        font-family: inherit;
        box-sizing: border-box;
      }
      .cal-input:focus {
        outline: none;
        border-color: var(--brand-green, #16a34a);
      }
      .cal-form-row {
        display: flex;
        gap: 12px;
      }

      @media (max-width: 768px) {
        .cal-grid-cell { height: 75px; padding: 2px; }
        .cal-day-num { width: 20px; height: 20px; font-size: 11px; }
        .cal-event-pill { font-size: 10px; padding: 2px 4px; }
        .cal-form-row { flex-direction: column; gap: 0; }
        .cal-agenda-card { flex-direction: column; }
        .cal-agenda-actions { width: 100%; justify-content: flex-end; }
      }
    `;
    document.head.appendChild(style);
  }

  async loadEvents() {
    try {
      const q = query(collection(db, 'calendar_events'), orderBy('startDate', 'asc'));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        // If first time running, seed initial realistic events so calendar isn't blank
        if (this.isAdmin) {
          console.log('Seeding initial school calendar events...');
          for (const ev of SAMPLE_CALENDAR_EVENTS) {
            await addDoc(collection(db, 'calendar_events'), {
              ...ev,
              createdBy: 'admin',
              creatorName: 'Administration',
              createdAt: serverTimestamp()
            });
          }
          const freshSnap = await getDocs(q);
          this.events = freshSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } else {
          // Non-admins see fallback sample events until admin adds more
          this.events = SAMPLE_CALENDAR_EVENTS.map((e, idx) => ({ id: 'sample_' + idx, ...e }));
        }
      } else {
        this.events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (err) {
      console.warn('Failed loading calendar events from database, using cached events:', err);
      this.events = SAMPLE_CALENDAR_EVENTS.map((e, idx) => ({ id: 'sample_' + idx, ...e }));
    }
  }

  attachEventListeners() {
    // Navigation
    document.getElementById('calPrevMonthBtn')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render();
    });

    document.getElementById('calNextMonthBtn')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render();
    });

    document.getElementById('calTodayBtn')?.addEventListener('click', () => {
      this.currentDate = new Date();
      this.render();
    });

    // View toggles
    document.getElementById('calViewGridBtn')?.addEventListener('click', () => {
      this.viewMode = 'grid';
      document.getElementById('calViewGridBtn').classList.add('active');
      document.getElementById('calViewAgendaBtn').classList.remove('active');
      this.render();
    });

    document.getElementById('calViewAgendaBtn')?.addEventListener('click', () => {
      this.viewMode = 'agenda';
      document.getElementById('calViewAgendaBtn').classList.add('active');
      document.getElementById('calViewGridBtn').classList.remove('active');
      this.render();
    });

    // Category chips
    document.querySelectorAll('#calChipsBar .cal-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#calChipsBar .cal-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.filterCategory = chip.dataset.cat || 'all';
        this.render();
      });
    });

    // Close Details Modal
    const detailsModal = document.getElementById('calEventDetailsModal');
    document.getElementById('calCloseDetailsModal')?.addEventListener('click', () => { detailsModal.style.display = 'none'; });
    document.getElementById('calCloseDetailsBtn')?.addEventListener('click', () => { detailsModal.style.display = 'none'; });
    detailsModal?.addEventListener('click', (e) => { if (e.target === detailsModal) detailsModal.style.display = 'none'; });

    // Admin Handlers
    if (this.isAdmin) {
      const addEditModal = document.getElementById('calAddEditModal');
      const allDayCheck = document.getElementById('calEventAllDayCheck');
      const timeRow = document.getElementById('calTimeRow');

      allDayCheck?.addEventListener('change', (e) => {
        if (timeRow) timeRow.style.display = e.target.checked ? 'none' : 'flex';
      });

      document.getElementById('calAddEventBtn')?.addEventListener('click', () => {
        this.openAddEventModal();
      });

      document.getElementById('calCloseAddEditModal')?.addEventListener('click', () => { addEditModal.style.display = 'none'; });
      document.getElementById('calCancelAddEditBtn')?.addEventListener('click', () => { addEditModal.style.display = 'none'; });
      addEditModal?.addEventListener('click', (e) => { if (e.target === addEditModal) addEditModal.style.display = 'none'; });

      document.getElementById('calAddEditForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSaveEvent();
      });

      document.getElementById('calDeleteEventBtn')?.addEventListener('click', async () => {
        if (this.activeModalEvent && confirm(`Are you sure you want to delete "${this.activeModalEvent.title}" from the school calendar?`)) {
          await this.handleDeleteEvent(this.activeModalEvent.id);
          detailsModal.style.display = 'none';
        }
      });

      document.getElementById('calEditEventBtn')?.addEventListener('click', () => {
        if (this.activeModalEvent) {
          detailsModal.style.display = 'none';
          this.openEditEventModal(this.activeModalEvent);
        }
      });
    }
  }

  getFilteredEvents() {
    return this.events.filter(ev => {
      // Role-based target audience filter
      if (this.role === 'student' && ev.targetAudience === 'staff') return false;
      if (this.role === 'staff' && ev.targetAudience === 'parents') return false;
      if (this.role === 'parent' && ev.targetAudience === 'staff') return false;

      // Category filter
      if (this.filterCategory !== 'all' && ev.category !== this.filterCategory) {
        return false;
      }
      return true;
    });
  }

  render() {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const headingEl = document.getElementById('calCurrentMonthHeading');
    if (headingEl) {
      headingEl.textContent = `${monthNames[month]} ${year}`;
    }

    const bodyEl = document.getElementById('calBodyContainer');
    if (!bodyEl) return;

    if (this.viewMode === 'grid') {
      bodyEl.innerHTML = this.renderMonthGrid(year, month);
      this.attachGridCellListeners();
    } else {
      bodyEl.innerHTML = this.renderAgendaView(year, month);
      this.attachAgendaListeners();
    }
  }

  renderMonthGrid(year, month) {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDate = today.getDate();

    const filteredEvents = this.getFilteredEvents();

    let html = `
      <table class="cal-grid-table">
        <thead class="cal-grid-header">
          <tr>
            <th>Sun</th>
            <th>Mon</th>
            <th>Tue</th>
            <th>Wed</th>
            <th>Thu</th>
            <th>Fri</th>
            <th>Sat</th>
          </tr>
        </thead>
        <tbody>
    `;

    let dayCount = 1;
    let nextMonthDay = 1;

    for (let row = 0; row < 6; row++) {
      html += '<tr>';
      for (let col = 0; col < 7; col++) {
        const cellIndex = row * 7 + col;

        if (cellIndex < firstDayIndex) {
          // Prev month padding
          const prevDay = daysInPrevMonth - (firstDayIndex - cellIndex - 1);
          html += `
            <td class="cal-grid-cell cell-dimmed">
              <div class="cal-cell-top">
                <span class="cal-day-num">${prevDay}</span>
              </div>
            </td>
          `;
        } else if (dayCount > daysInMonth) {
          // Next month padding
          html += `
            <td class="cal-grid-cell cell-dimmed">
              <div class="cal-cell-top">
                <span class="cal-day-num">${nextMonthDay++}</span>
              </div>
            </td>
          `;
        } else {
          // Current month cell
          const curDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCount).padStart(2, '0')}`;
          const isToday = isCurrentMonth && dayCount === todayDate;

          // Events on this date
          const dayEvents = filteredEvents.filter(ev => {
            if (ev.startDate === curDayStr) return true;
            if (ev.endDate && ev.startDate <= curDayStr && ev.endDate >= curDayStr) return true;
            return false;
          });

          html += `
            <td class="cal-grid-cell ${isToday ? 'cell-today' : ''}" data-date="${curDayStr}">
              <div class="cal-cell-top">
                <span class="cal-day-num">${dayCount}</span>
                ${this.isAdmin ? `
                  <button type="button" class="cal-cell-add-btn" data-date="${curDayStr}" title="Add Event for ${curDayStr}">+</button>
                ` : ''}
              </div>
              <div class="cal-cell-events">
                ${dayEvents.slice(0, 3).map(ev => {
                  const catClass = `cal-pill-${ev.category || 'academic'}`;
                  const icon = CALENDAR_CATEGORIES[ev.category]?.icon || '📌';
                  const timeStr = ev.isAllDay ? '' : (ev.startTime ? ev.startTime + ' ' : '');
                  return `
                    <div class="cal-event-pill ${catClass}" data-id="${ev.id}" title="${this.escapeHtml(ev.title)}">
                      ${icon} ${timeStr}${this.escapeHtml(ev.title)}
                    </div>
                  `;
                }).join('')}
                ${dayEvents.length > 3 ? `
                  <div class="cal-more-pill" data-date="${curDayStr}">+${dayEvents.length - 3} more</div>
                ` : ''}
              </div>
            </td>
          `;
          dayCount++;
        }
      }
      html += '</tr>';
      if (dayCount > daysInMonth) break;
    }

    html += '</tbody></table>';
    return html;
  }

  attachGridCellListeners() {
    // Event pill clicks -> details modal
    document.querySelectorAll('.cal-event-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const evId = pill.dataset.id;
        const ev = this.events.find(x => x.id === evId);
        if (ev) this.openDetailsModal(ev);
      });
    });

    // Admin quick-add on cell "+"
    if (this.isAdmin) {
      document.querySelectorAll('.cal-cell-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetDate = btn.dataset.date;
          this.openAddEventModal(targetDate);
        });
      });
    }
  }

  renderAgendaView(year, month) {
    const filteredEvents = this.getFilteredEvents();

    if (!filteredEvents.length) {
      return `
        <div style="text-align:center; padding:50px 20px; color:#64748b;">
          <div style="font-size:36px; margin-bottom:8px;">📅</div>
          <h4 style="margin:0 0 6px 0; color:#0f172a; font-size:16px;">No Events Found</h4>
          <p style="margin:0; font-size:13px;">There are no scheduled calendar events matching this category filter.</p>
        </div>
      `;
    }

    // Sort chronologically
    const sorted = [...filteredEvents].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let html = '<div class="cal-agenda-wrap">';
    sorted.forEach(ev => {
      const cat = CALENDAR_CATEGORIES[ev.category] || CALENDAR_CATEGORIES.academic;
      const d = ev.startDate ? new Date(ev.startDate + 'T00:00:00') : new Date();
      const monthStr = monthShortNames[d.getMonth()] || 'DAY';
      const dayNum = d.getDate();

      const timeLabel = ev.isAllDay ? 'All-Day Event' : `${ev.startTime || '09:00'} ${ev.endTime ? '– ' + ev.endTime : ''}`;
      const endLabel = ev.endDate && ev.endDate !== ev.startDate ? `to ${ev.endDate}` : '';

      html += `
        <div class="cal-agenda-card" data-id="${ev.id}">
          <div class="cal-agenda-left">
            <div class="cal-agenda-date-box">
              <span class="cal-date-month">${monthStr}</span>
              <span class="cal-date-day">${dayNum}</span>
            </div>
            <div class="cal-agenda-content">
              <h4>${this.escapeHtml(ev.title)}</h4>
              <div class="cal-agenda-meta">
                <span class="cal-modal-cat-badge" style="background:${cat.bg}; color:${cat.color}; border:1px solid ${cat.border};">${cat.icon} ${cat.label}</span>
                <span>⏰ ${timeLabel} ${endLabel}</span>
                ${ev.location ? `<span>📍 ${this.escapeHtml(ev.location)}</span>` : ''}
                ${ev.targetAudience ? `<span>👥 ${this.getAudienceLabel(ev.targetAudience)}</span>` : ''}
              </div>
              ${ev.description ? `<p class="cal-agenda-desc">${this.escapeHtml(ev.description)}</p>` : ''}
            </div>
          </div>
          <div class="cal-agenda-actions">
            ${this.isAdmin ? `
              <button type="button" class="btn btn-outline btn-sm cal-agenda-edit-btn" data-id="${ev.id}">Edit</button>
              <button type="button" class="btn btn-danger btn-sm cal-agenda-del-btn" data-id="${ev.id}">Delete</button>
            ` : `
              <button type="button" class="btn btn-outline btn-sm cal-agenda-view-btn" data-id="${ev.id}">View</button>
            `}
          </div>
        </div>
      `;
    });
    html += '</div>';

    return html;
  }

  attachAgendaListeners() {
    // View Details
    document.querySelectorAll('.cal-agenda-view-btn, .cal-agenda-card').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.cal-agenda-actions') && this.isAdmin) return;
        const evId = el.dataset.id;
        const ev = this.events.find(x => x.id === evId);
        if (ev) this.openDetailsModal(ev);
      });
    });

    if (this.isAdmin) {
      document.querySelectorAll('.cal-agenda-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const evId = btn.dataset.id;
          const ev = this.events.find(x => x.id === evId);
          if (ev) this.openEditEventModal(ev);
        });
      });

      document.querySelectorAll('.cal-agenda-del-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const evId = btn.dataset.id;
          const ev = this.events.find(x => x.id === evId);
          if (ev && confirm(`Delete event "${ev.title}"?`)) {
            await this.handleDeleteEvent(evId);
          }
        });
      });
    }
  }

  openDetailsModal(ev) {
    this.activeModalEvent = ev;
    const cat = CALENDAR_CATEGORIES[ev.category] || CALENDAR_CATEGORIES.academic;

    const modal = document.getElementById('calEventDetailsModal');
    if (!modal) return;

    document.getElementById('calDetailsTitle').textContent = ev.title || 'Untitled Event';

    const catBadge = document.getElementById('calDetailsCatBadge');
    if (catBadge) {
      catBadge.textContent = `${cat.icon} ${cat.label}`;
      catBadge.style.background = cat.bg;
      catBadge.style.color = cat.color;
      catBadge.style.border = `1px solid ${cat.border}`;
    }

    const timeStr = ev.isAllDay
      ? `📅 ${ev.startDate}${ev.endDate && ev.endDate !== ev.startDate ? ' to ' + ev.endDate : ''} • All Day`
      : `📅 ${ev.startDate} • ⏰ ${ev.startTime || '09:00'} ${ev.endTime ? 'to ' + ev.endTime : ''}`;
    document.getElementById('calDetailsTime').textContent = timeStr;

    document.getElementById('calDetailsLocation').textContent = ev.location || 'Campus / School Premises';
    document.getElementById('calDetailsAudience').textContent = this.getAudienceLabel(ev.targetAudience);
    document.getElementById('calDetailsDesc').textContent = ev.description || 'No detailed instructions recorded.';

    modal.style.display = 'flex';
  }

  openAddEventModal(defaultDate = null) {
    if (!this.isAdmin) return;
    const modal = document.getElementById('calAddEditModal');
    if (!modal) return;

    document.getElementById('calAddEditModalTitle').textContent = '+ Add Calendar Event';
    document.getElementById('calEventId').value = '';
    document.getElementById('calEventTitleInput').value = '';
    document.getElementById('calEventCategorySelect').value = 'academic';
    document.getElementById('calEventAudienceSelect').value = 'all';

    const todayStr = defaultDate || new Date().toISOString().split('T')[0];
    document.getElementById('calEventStartDateInput').value = todayStr;
    document.getElementById('calEventEndDateInput').value = '';

    const allDayCheck = document.getElementById('calEventAllDayCheck');
    if (allDayCheck) allDayCheck.checked = false;
    const timeRow = document.getElementById('calTimeRow');
    if (timeRow) timeRow.style.display = 'flex';

    document.getElementById('calEventStartTimeInput').value = '09:00';
    document.getElementById('calEventEndTimeInput').value = '12:30';
    document.getElementById('calEventLocationInput').value = '';
    document.getElementById('calEventDescInput').value = '';

    modal.style.display = 'flex';
  }

  openEditEventModal(ev) {
    if (!this.isAdmin) return;
    const modal = document.getElementById('calAddEditModal');
    if (!modal) return;

    document.getElementById('calAddEditModalTitle').textContent = 'Edit / Reschedule Event';
    document.getElementById('calEventId').value = ev.id || '';
    document.getElementById('calEventTitleInput').value = ev.title || '';
    document.getElementById('calEventCategorySelect').value = ev.category || 'academic';
    document.getElementById('calEventAudienceSelect').value = ev.targetAudience || 'all';
    document.getElementById('calEventStartDateInput').value = ev.startDate || '';
    document.getElementById('calEventEndDateInput').value = ev.endDate || '';

    const allDayCheck = document.getElementById('calEventAllDayCheck');
    const timeRow = document.getElementById('calTimeRow');
    if (allDayCheck) allDayCheck.checked = Boolean(ev.isAllDay);
    if (timeRow) timeRow.style.display = ev.isAllDay ? 'none' : 'flex';

    document.getElementById('calEventStartTimeInput').value = ev.startTime || '09:00';
    document.getElementById('calEventEndTimeInput').value = ev.endTime || '12:30';
    document.getElementById('calEventLocationInput').value = ev.location || '';
    document.getElementById('calEventDescInput').value = ev.description || '';

    modal.style.display = 'flex';
  }

  async handleSaveEvent() {
    const saveBtn = document.getElementById('calSaveEventBtn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    try {
      const id = document.getElementById('calEventId').value.trim();
      const title = document.getElementById('calEventTitleInput').value.trim();
      const category = document.getElementById('calEventCategorySelect').value;
      const targetAudience = document.getElementById('calEventAudienceSelect').value;
      const startDate = document.getElementById('calEventStartDateInput').value;
      const endDate = document.getElementById('calEventEndDateInput').value;
      const isAllDay = document.getElementById('calEventAllDayCheck').checked;
      const startTime = isAllDay ? null : document.getElementById('calEventStartTimeInput').value;
      const endTime = isAllDay ? null : document.getElementById('calEventEndTimeInput').value;
      const location = document.getElementById('calEventLocationInput').value.trim();
      const description = document.getElementById('calEventDescInput').value.trim();

      const payload = {
        title,
        category,
        targetAudience,
        startDate,
        endDate: endDate || null,
        isAllDay,
        startTime,
        endTime,
        location: location || null,
        description: description || null,
        updatedAt: serverTimestamp()
      };

      if (id) {
        // Update existing event
        await updateDoc(doc(db, 'calendar_events', id), payload);
        const idx = this.events.findIndex(x => x.id === id);
        if (idx !== -1) {
          this.events[idx] = { ...this.events[idx], ...payload };
        }
      } else {
        // Create new event
        payload.createdBy = 'admin';
        payload.creatorName = 'Administration';
        payload.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'calendar_events'), payload);
        this.events.push({ id: docRef.id, ...payload });
      }

      document.getElementById('calAddEditModal').style.display = 'none';
      this.render();

      if (typeof window.showToast === 'function') {
        window.showToast(id ? 'Calendar event updated successfully.' : 'Calendar event published successfully.');
      }
    } catch (err) {
      alert('Failed to save calendar event: ' + err.message);
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save & Publish'; }
    }
  }

  async handleDeleteEvent(id) {
    try {
      await deleteDoc(doc(db, 'calendar_events', id));
      this.events = this.events.filter(x => x.id !== id);
      this.render();
      if (typeof window.showToast === 'function') {
        window.showToast('Event removed from school calendar.');
      }
    } catch (err) {
      alert('Failed to delete event: ' + err.message);
    }
  }

  getAudienceLabel(key) {
    if (key === 'students') return '🎓 Students Only';
    if (key === 'staff') return '👨‍🏫 Faculty & Staff Only';
    if (key === 'parents') return '👨‍👩‍👧 Parents Only';
    return '👥 All School Community';
  }

  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Module entry function called by all dashboards
export function initSchoolCalendar(options) {
  return new SchoolCalendar(options);
}
