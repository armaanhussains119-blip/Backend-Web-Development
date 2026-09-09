module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  maxArticles: parseInt(process.env.MAX_ARTICLES) || 50,
};