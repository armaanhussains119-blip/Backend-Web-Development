const express = require('express');
const router = express.Router();
const ctrl = require('./../controllers/articlesController');
const { createArticle, updateArticle } = require('../validators/article.validator');
const validateRequest = require('../utils/validateRequest');

router.get('/', ctrl.list);

router.post('/', createArticle, validateRequest, ctrl.create);

router.patch('/:id', updateArticle, validateRequest, ctrl.update);

module.exports = router;