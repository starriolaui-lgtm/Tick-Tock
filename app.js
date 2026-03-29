const express = require('express');
const cookieSession = require('cookie-session');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'secret123'],
  maxAge: 24 * 60 * 60 * 1000
}));

const authRoutes    = require('./routes/auth');
const studentRoutes = require('./routes/student');

app.use('/auth',    authRoutes);
app.use('/student', studentRoutes);

app.get('/', (req, res) => res.redirect('/auth/login'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});