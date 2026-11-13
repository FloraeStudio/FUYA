'use strict';

// 作品展示：把「轉蛋、企劃、委託」三個分類的文章合併成一份清單（/works/），
// 依日期由新到舊，每頁 12 篇。文章本身的分類與網址都不變，只是多一個總覽入口。

var pagination = require('hexo-pagination');

var WORK_CATS = ['轉蛋', '企劃', '委託'];
var PER_PAGE = 12;

hexo.extend.generator.register('works', function (locals) {
  var posts = locals.posts.filter(function (p) {
    return (p.categories || []).some(function (c) { return WORK_CATS.indexOf(c.name) !== -1; });
  }).sort('-date');

  return pagination('works/', posts, {
    perPage: PER_PAGE,
    layout: ['works'],
    format: (hexo.config.pagination_dir || 'page') + '/%d/',
    data: { total_posts: posts.length, title: '作品展示' }
  });
});
