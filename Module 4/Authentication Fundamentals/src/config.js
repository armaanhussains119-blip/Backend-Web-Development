const bcryptRounds = Number(process.env.BCRYPT_ROUNDS || 12);

if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
  throw new Error('BCRYPT_ROUNDS must be an integer between 10 and 15');
}

module.exports = { bcryptRounds };
