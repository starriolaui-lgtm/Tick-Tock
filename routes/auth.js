const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const db       = require('../conn');

function popMessage(req) {
  const msg = req.session.message || null;
  req.session.message = null;
  return msg;
}

// GET /auth/register
router.get('/register', (req, res) => {
  res.render('register', { message: popMessage(req) });
});

// POST /auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, course, year_level } = req.body;
  try {
    const hashedPass = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO students (name, email, password, course, year_level) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPass, course, year_level]
    );
    req.session.message = { type: 'success', text: 'Account created successfully!' };
    res.redirect('/auth/login');
  } catch (err) {
  console.error('REGISTER ERROR:', err.message, err.code);
  req.session.message = { type: 'danger', text: `ERROR: ${err.message}` };
  res.redirect('/auth/register');
}
});

// GET /auth/login
router.get('/login', (req, res) => {
  res.render('login', { message: popMessage(req) });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM students WHERE email = ?', [email]);
    const student = rows[0];

    if (!student) {
      req.session.message = { type: 'danger', text: 'No student found with that email.' };
      return res.redirect('/auth/login');
    }

    const match = await bcrypt.compare(password, student.password);
    if (!match) {
      req.session.message = { type: 'danger', text: 'Incorrect password.' };
      return res.redirect('/auth/login');
    }

    req.session.student = {
      student_id: student.student_id,
      name:       student.name,
      email:      student.email,
      course:     student.course,
      year_level: student.year_level
    };

    req.session.message = { type: 'success', text: 'Login successful!' };
    res.redirect('/student/dashboard');
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Login failed.' };
    res.redirect('/auth/login');
  }
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

module.exports = router;