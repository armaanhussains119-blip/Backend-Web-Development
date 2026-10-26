const authService = require('../services/authService');

async function register(req, res) {
  const user = await authService.register(req.body);
  return res.status(201).json({ data: user });
}

async function login(req, res) {
  const user = await authService.login(req.body);
  return res.status(200).json({ data: user });
}

module.exports = { register, login };
