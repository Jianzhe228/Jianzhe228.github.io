'use strict';

hexo.extend.injector.register('head_end', '<link rel="stylesheet" href="/css/local-search.css">', 'default');

hexo.extend.injector.register('body_end', [
  '<div id="local-search-overlay" style="display:none;">',
  '  <div id="local-search-container">',
  '    <div id="local-search-header">',
  '      <input id="local-search-input" type="text" placeholder="搜索文章..." autocomplete="off" />',
  '      <span id="local-search-close">&times;</span>',
  '    </div>',
  '    <div id="local-search-results"></div>',
  '  </div>',
  '</div>',
  '<script src="/js/local-search.js"></script>'
].join('\n'), 'default');
