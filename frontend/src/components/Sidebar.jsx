import React, { useState, useEffect } from 'react';
import './Sidebar.css';

const Sidebar = () => {
  // Independent state for left sidebar - not connected to main content
  const [selectedItem, setSelectedItem] = useState('drives');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState({}); // Store notes by date key
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const sidebarItems = [
    { id: 'calendar', icon: 'fas fa-calendar-alt' },
    { id: 'home', icon: 'fas fa-home' },
    { id: 'drives-quick', icon: 'fas fa-bolt' },
    { id: 'drives', icon: 'fas fa-briefcase' },
    { id: 'students', icon: 'fas fa-users' },
    { id: 'messages', icon: 'fas fa-envelope' },
    { id: 'analytics', icon: 'fas fa-chart-bar' },
    { id: 'settings', icon: 'fas fa-cog' },
    { id: 'logout-nav', icon: 'fas fa-sign-out-alt' }
  ];

  // Non-functional button handler - just updates local state for visual feedback
  const handleItemClick = (itemId) => {
    setSelectedItem(itemId);
    if (itemId === 'calendar') {
      setShowCalendar(!showCalendar);
    }
    // No actual functionality - just visual state change
    console.log(`Left sidebar item clicked: ${itemId} (non-functional)`);
  };

  const handleCalendarClick = () => {
    setShowCalendar(!showCalendar);
  };

  const closeCalendar = () => {
    setShowCalendar(false);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (showCalendar) {
        switch (event.key) {
          case 'Escape':
            closeCalendar();
            break;
          case 'ArrowLeft':
            event.preventDefault();
            navigateToPrevMonth();
            break;
          case 'ArrowRight':
            event.preventDefault();
            navigateToNextMonth();
            break;
          case 'Home':
            event.preventDefault();
            navigateToToday();
            break;
          default:
            break;
        }
      }
    };

    if (showCalendar) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when calendar is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showCalendar, currentMonth, currentYear]);

  const handleDateClick = (day, month, year) => {
    const dateKey = `${day}/${month + 1}/${year}`;
    setSelectedDate({ day, month, year, dateKey });
    setNoteText(notes[dateKey] || '');
    setShowNoteModal(true);
  };

  const navigateToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const navigateToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const navigateToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const handleSaveNote = () => {
    if (selectedDate) {
      const updatedNotes = { ...notes };
      if (noteText.trim()) {
        updatedNotes[selectedDate.dateKey] = noteText.trim();
      } else {
        delete updatedNotes[selectedDate.dateKey];
      }
      setNotes(updatedNotes);
      setShowNoteModal(false);
      setSelectedDate(null);
      setNoteText('');
    }
  };

  const handleCancelNote = () => {
    setShowNoteModal(false);
    setSelectedDate(null);
    setNoteText('');
  };

  const getCurrentDate = () => {
    const now = new Date();
    return {
      month: currentMonth,
      year: currentYear,
      today: now.getDate(),
      isCurrentMonth: now.getMonth() === currentMonth && now.getFullYear() === currentYear
    };
  };

  const getMonthName = (monthIndex) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const { month, year, today, isCurrentMonth } = getCurrentDate();
    const daysInMonth = getDaysInMonth(month, year);
    const firstDay = getFirstDayOfMonth(month, year);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${day}/${month + 1}/${year}`;
      const hasNote = notes[dateKey];
      const isToday = day === today && isCurrentMonth;

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${hasNote ? 'has-note' : ''}`}
          onClick={() => handleDateClick(day, month, year)}
        >
          <div className="date-number">{day}</div>
          {hasNote && (
            <div className="date-note" title={hasNote}>
              {hasNote.length > 20 ? hasNote.substring(0, 20) + '...' : hasNote}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="calendar-modal">
        {/* Calendar overlay for click-to-close */}
        <div className="calendar-overlay" onClick={closeCalendar}></div>

        <div className="calendar-content">
          <div className="calendar-header">
            <div className="calendar-navigation">
              <button className="nav-btn" onClick={navigateToPrevMonth} title="Previous Month (←)">
                ‹
              </button>
              <button className="nav-btn today-btn" onClick={navigateToToday} title="Go to Today (Home)">
                Today
              </button>
              <button className="nav-btn" onClick={navigateToNextMonth} title="Next Month (→)">
                ›
              </button>
            </div>
            <h3>{getMonthName(month)} {year}</h3>
            <div className="calendar-actions">
              <button className="nav-btn help-btn" title="Keyboard Shortcuts">
                ?
              </button>
              <button className="close-calendar" onClick={closeCalendar} title="Close Calendar (Esc)">
                ✕
              </button>
            </div>
          </div>
          <div className="calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>
          <div className="calendar-days">
            {days}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="sidebar expanded">
      {showCalendar && renderCalendar()}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="note-modal-overlay">
          <div className="note-modal">
            <div className="note-modal-header">
              <h3>Add Note for {selectedDate?.day}/{selectedDate?.month + 1}/{selectedDate?.year}</h3>
              <button className="close-note" onClick={handleCancelNote}>✕</button>
            </div>
            <div className="note-modal-body">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter your note here..."
                rows={4}
                className="note-textarea"
              />
            </div>
            <div className="note-modal-footer">
              <button className="note-btn note-btn-cancel" onClick={handleCancelNote}>
                Cancel
              </button>
              <button className="note-btn note-btn-save" onClick={handleSaveNote}>
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-content">
        {sidebarItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-item ${selectedItem === item.id ? 'active' : ''}`}
            onClick={() => handleItemClick(item.id)}
          >
            <i className={`${item.icon} sidebar-icon`}></i>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;