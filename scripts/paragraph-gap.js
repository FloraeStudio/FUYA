'use strict';

// 讓「多打幾個空行」可以在渲染後變成一個乾淨、大小統一的段落大留白，
// 取代直接在 Markdown 裡塞 <br><br><br> 的做法。
//
// 使用方式（在 Decap CMS 的內文欄位裡）：
//   - 一般段落之間：留一個空行就好，跟平常寫法一樣。
//   - 想要比一般段落更大的空白（例如場景轉換、情緒停頓）：
//     多按幾次 Enter，空兩行以上即可，不用手動加任何標籤。
//     不管妳空了 2 行還是 5 行，渲染出來都是同一個固定大小的留白，
//     不會再有忽大忽小、不一致的間距。

hexo.extend.filter.register('before_post_render', function (data) {
  if (!data.content) return data;

  // 統一換行符號（Windows 編輯器存檔常是 \r\n）
  var content = data.content.replace(/\r\n/g, '\n');

  // 連續 3 個以上換行字元（＝中間夾了 2 行以上的空白行）視為「大分段」，
  // 統一轉成同一個標記元素，交給 CSS 控制固定高度。
  content = content.replace(/\n{3,}/g, '\n\n<div class="scene-gap"></div>\n\n');

  data.content = content;
  return data;
});