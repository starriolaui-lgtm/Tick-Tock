const express = require('express');
const router  = express.Router();
const db      = require('../conn');

function popMessage(req) {
  const msg = req.session.message || null;
  req.session.message = null;
  return msg;
}

function requireLogin(req, res, next) {
  if (!req.session.student) return res.redirect('/auth/login');
  next();
}

// ─── DASHBOARD ───────────────────────────────────────────────
router.get('/dashboard', requireLogin, async (req, res) => {
  const studId = req.session.student.student_id;
  try {
    const [[{ totalTasks }]]     = await db.query('SELECT COUNT(*) AS totalTasks FROM tasks WHERE student_id = ?', [studId]);
    const [[{ completedTasks }]] = await db.query("SELECT COUNT(*) AS completedTasks FROM tasks WHERE student_id = ? AND status = 'Done'", [studId]);
    const [[{ pendingTasks }]]   = await db.query("SELECT COUNT(*) AS pendingTasks FROM tasks WHERE student_id = ? AND status != 'Done'", [studId]);
    const [[priorityRow]]        = await db.query(`
      SELECT
        SUM(priority = 'High')   AS high,
        SUM(priority = 'Medium') AS medium,
        SUM(priority = 'Low')    AS low
      FROM tasks WHERE student_id = ?`, [studId]);
    const [[{ totalSession }]]      = await db.query('SELECT COUNT(*) AS totalSession FROM study_sessions WHERE student_id = ?', [studId]);
    const [[{ total_minutes }]]     = await db.query('SELECT COALESCE(SUM(duration_minutes),0) AS total_minutes FROM study_sessions WHERE student_id = ?', [studId]);
    const [studyBySubject]          = await db.query('SELECT subject, SUM(duration_minutes) AS total_minutes FROM study_sessions WHERE student_id = ? GROUP BY subject', [studId]);
    const [recentSessions]          = await db.query('SELECT subject, duration_minutes, start_time FROM study_sessions WHERE student_id = ? ORDER BY start_time DESC LIMIT 5', [studId]);

    res.render('dashboard', {
      student:        req.session.student,
      totalTasks,
      completedTasks,
      pendingTasks,
      totalSession,
      totalStudyHours: (total_minutes / 60).toFixed(1),
      priorityStat:   { high: priorityRow.high || 0, medium: priorityRow.medium || 0, low: priorityRow.low || 0 },
      studyBySubject,
      recentSessions,
      message:        popMessage(req)
    });
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Error loading dashboard.' };
    res.redirect('/auth/login');
  }
});

// ─── DAILY PLANNER ───────────────────────────────────────────
router.get('/daily-planner', requireLogin, async (req, res) => {
  const studId = req.session.student.student_id;
  try {
    const [tasks] = await db.query('SELECT * FROM tasks WHERE student_id = ? ORDER BY start_time ASC', [studId]);
    res.render('daily-planner', { student: req.session.student, tasks, message: popMessage(req) });
  } catch (err) {
    console.error(err);
    res.redirect('/student/dashboard');
  }
});

// POST add task
router.post('/add-task', requireLogin, async (req, res) => {
  const { title, description, subject, start_time, end_time, priority } = req.body;
  const studId = req.session.student.student_id;
  try {
    await db.query(
      'INSERT INTO tasks (student_id, title, description, subject, start_time, end_time, priority) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [studId, title, description, subject, start_time, end_time, priority]
    );
    req.session.message = { type: 'success', text: 'Task added successfully!' };
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Failed to add task.' };
  }
  res.redirect('/student/daily-planner');
});

// POST update status
router.post('/update-status/:task_id', requireLogin, async (req, res) => {
  const { task_id } = req.params;
  const newStatus = req.body.status === 'Done' ? 'Done' : 'Pending';
  try {
    await db.query('UPDATE tasks SET status = ? WHERE task_id = ?', [newStatus, task_id]);
    req.session.message = { type: 'success', text: `Task marked as ${newStatus}.` };
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Failed to update task status.' };
  }
  res.redirect('/student/daily-planner');
});

// POST edit task
router.post('/edit-task/:task_id', requireLogin, async (req, res) => {
  const { task_id } = req.params;
  const { title, description, subject, start_time, end_time, priority } = req.body;
  try {
    await db.query(
      'UPDATE tasks SET title=?, description=?, subject=?, start_time=?, end_time=?, priority=? WHERE task_id=?',
      [title, description, subject, start_time, end_time, priority, task_id]
    );
    req.session.message = { type: 'success', text: 'Task updated successfully!' };
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Error updating task.' };
  }
  res.redirect('/student/daily-planner');
});

// POST delete task
router.post('/delete-task/:task_id', requireLogin, async (req, res) => {
  const { task_id } = req.params;
  try {
    await db.query('DELETE FROM tasks WHERE task_id = ?', [task_id]);
    req.session.message = { type: 'success', text: 'Task deleted successfully!' };
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Error deleting task.' };
  }
  res.redirect('/student/daily-planner');
});

// ─── STUDY TRACKER ───────────────────────────────────────────
router.get('/study-tracker', requireLogin, async (req, res) => {
  const studId = req.session.student.student_id;
  try {
    const [sessions] = await db.query(
      'SELECT * FROM study_sessions WHERE student_id = ? ORDER BY start_time DESC, date_created DESC',
      [studId]
    );
    res.render('study-tracker', { student: req.session.student, sessions, message: popMessage(req) });
  } catch (err) {
    console.error(err);
    res.redirect('/student/dashboard');
  }
});

// POST log session
router.post('/log-session', requireLogin, async (req, res) => {
  const studId = req.session.student.student_id;
  const { subject, description, start_time, duration_minutes } = req.body;
  try {
    await db.query(
      'INSERT INTO study_sessions (student_id, subject, description, start_time, duration_minutes) VALUES (?, ?, ?, ?, ?)',
      [studId, subject, description, start_time || null, duration_minutes || 0]
    );
    req.session.message = { type: 'success', text: 'Study session logged successfully!' };
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Error logging study session.' };
  }
  res.redirect('/student/study-tracker');
});

// POST delete session
router.post('/delete-session/:study_id', requireLogin, async (req, res) => {
  const { study_id } = req.params;
  try {
    await db.query('DELETE FROM study_sessions WHERE study_id = ?', [study_id]);
    req.session.message = { type: 'success', text: 'Study session deleted successfully!' };
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Error deleting study session.' };
  }
  res.redirect('/student/study-tracker');
});

// ─── PROFILE ─────────────────────────────────────────────────
router.get('/profile', requireLogin, async (req, res) => {
  const studId = req.session.student.student_id;
  try {
    const [[user]] = await db.query(
      'SELECT name, email, course, year_level FROM students WHERE student_id = ?',
      [studId]
    );
    if (!user) {
      req.session.message = { type: 'danger', text: 'Profile not found.' };
      return res.redirect('/student/dashboard');
    }
    res.render('profile', { student: req.session.student, user, message: popMessage(req) });
  } catch (err) {
    console.error(err);
    res.redirect('/student/dashboard');
  }
});

// POST update profile
router.post('/update-profile', requireLogin, async (req, res) => {
  const studId = req.session.student.student_id;
  const { name, course, year_level } = req.body;
  try {
    await db.query(
      'UPDATE students SET name=?, course=?, year_level=? WHERE student_id=?',
      [name, course, year_level, studId]
    );
    req.session.student.name       = name;
    req.session.student.course     = course;
    req.session.student.year_level = year_level;
    req.session.message = { type: 'success', text: 'Profile updated successfully!' };
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Failed to update profile.' };
  }
  res.redirect('/student/profile');
});

module.exports = router;