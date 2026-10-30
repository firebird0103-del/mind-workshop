# 多彩生活物件圖庫

本版使用內建 image_gen 工具，依使用者認可的多彩扁平生活物件樣張延伸。不是系統 emoji，也不是抽象 SVG 幾何圖案。

## 檔案

- `objects-1.png`：生活用品，20 件。
- `objects-2.png`：交通與戶外，20 件。
- `objects-3.png`：食物，20 件。
- `objects-4.png`：動物與自然，20 件。
- `objects-5.png`：運動與日用品，20 件（v6 新增）。

每張原始圖集為 1402 × 1122。PNG 原圖未被二次改畫。
`brain-assets.js` 記錄每一件物品的名稱、ID 與顯示視窗。
圖集的空白間隔不是精確等寬，已按實際分隔修正視窗，避免切到相鄰圖形。
頁面使用 SVG 容器顯示 PNG 視窗，不是重新繪製的向量代用品。
`art-gallery.html` 可查看 100 件圖形與 48px 小尺寸。

## 抽題規則

同一張盤面內不重複，替換圖案也不會與本題基準圖重複。
跨題採最少使用次數優先，使用次数相同時隨機抽選。
預設找錯三題總共需要 19 + 28 + 39 = 86 個物件位置，100 件圖庫足夠，因此預設三題不會跨題重複。更高密度或更多題數在耗盡 100 件後仍可能跨題重用。
最大 8×8 配 8 個不同處需要 72 件，圖庫足夠。

## 生成提示詞（內建工具，非 CLI）

參考圖：圖集 1～4 使用使用者認可的 12 件生活物件樣張；圖集 5 以既有圖集 1 延伸風格。

### 圖集 1

```text
Use case: illustration-story. Asset type: production sprite atlas for an all-ages everyday-object cognition game. Image 1 is STYLE REFERENCE ONLY. Match its cheerful, clear, colorful, gently rounded flat illustrations, minimal shallow shading, confident natural object silhouettes, saturated blue teal coral yellow purple. Not realistic, not abstract, not preschool mascots. Generate a clean 1600x1280 landscape sheet EXACTLY FIVE equal columns by FOUR equal rows, 20 different objects. Invisible uniform grid: each cell 320x320. Center each object at its cell center, contain it inside the central 70% of the cell, all similar optical scale. Pure white background everywhere; NO tile cards, NO borders, NO shadows outside objects, NO text, NO labels, NO numbers, NO dividers, NO outer margins, NO extra decorative objects. Exactly one listed item per cell. Order row-major left-to-right: 1: blue bird with coral wing; 2: orange basketball; 3: blue television with antenna; 4: yellow bananas; 5: turquoise bicycle; 6: red and yellow umbrella; 7: red apple; 8: turquoise chair; 9: yellow blue bus; 10: coral scissors; 11: purple mug; 12: yellow shade coral table lamp; 13: blue and purple butterfly; 14: green leaf; 15: yellow sun; 16: orange fish; 17: purple camera; 18: open blue book; 19: gold key; 20: red sneaker. All shapes recognizable instantly even at 48 pixels. Preserve essential object anatomy.
```

### 圖集 2

```text
Use case: illustration-story. Asset type: production sprite atlas for an all-ages everyday-object cognition game. Image 1 is STYLE REFERENCE ONLY. Match its cheerful, clear, colorful, gently rounded flat illustrations, minimal shallow shading, confident natural object silhouettes, saturated blue teal coral yellow purple. Not realistic, not abstract, not preschool mascots. Generate a clean 1600x1280 landscape sheet EXACTLY FIVE equal columns by FOUR equal rows, 20 different objects. Invisible uniform grid: each cell 320x320. Center each object at its cell center, contain it inside the central 70% of the cell, all similar optical scale. Pure white background everywhere; NO tile cards, NO borders, NO shadows outside objects, NO text, NO labels, NO numbers, NO dividers, NO outer margins, NO extra decorative objects. Exactly one listed item per cell. Order row-major left-to-right: 1: red car; 2: blue airplane; 3: green locomotive train; 4: yellow sailboat; 5: coral helicopter; 6: blue delivery truck; 7: teal kick scooter; 8: traffic light; 9: arched bridge; 10: house with red roof; 11: tall blue office building; 12: orange camping tent; 13: striped lighthouse; 14: white coral rocket; 15: purple balloon with string; 16: blue backpack; 17: yellow sun hat; 18: blue eyeglasses; 19: orange wristwatch; 20: green telephone with handset. All shapes recognizable instantly even at 48 pixels. Preserve essential object anatomy.
```

### 圖集 3

```text
Use case: illustration-story. Asset type: production sprite atlas for an all-ages everyday-object cognition game. Image 1 is STYLE REFERENCE ONLY. Match its cheerful, clear, colorful, gently rounded flat illustrations, minimal shallow shading, confident natural object silhouettes, saturated blue teal coral yellow purple. Not realistic, not abstract, not preschool mascots. Generate a clean 1600x1280 landscape sheet EXACTLY FIVE equal columns by FOUR equal rows, 20 different objects. Invisible uniform grid: each cell 320x320. Center each object at its cell center, contain it inside the central 70% of the cell, all similar optical scale. Pure white background everywhere; NO tile cards, NO borders, NO shadows outside objects, NO text, NO labels, NO numbers, NO dividers, NO outer margins, NO extra decorative objects. Exactly one listed item per cell. Order row-major left-to-right: 1: watermelon slice; 2: purple grapes; 3: red strawberry; 4: pineapple; 5: green pear; 6: orange fruit with leaf; 7: pair of red cherries; 8: orange carrot; 9: yellow corn cob; 10: green broccoli; 11: red mushroom; 12: fried egg; 13: loaf of bread with slice; 14: yellow cheese wedge; 15: pink donut; 16: ice cream cone; 17: slice of birthday cake; 18: hamburger; 19: pizza slice; 20: blue bowl of rice. All shapes recognizable instantly even at 48 pixels. Preserve essential object anatomy.
```

### 圖集 4

```text
Use case: illustration-story. Asset type: production sprite atlas for an all-ages everyday-object cognition game. Image 1 is STYLE REFERENCE ONLY. Match its cheerful, clear, colorful, gently rounded flat illustrations, minimal shallow shading, confident natural object silhouettes, saturated blue teal coral yellow purple. Not realistic, not abstract, not preschool mascots. Generate a clean 1600x1280 landscape sheet EXACTLY FIVE equal columns by FOUR equal rows, 20 different objects. Invisible uniform grid: each cell 320x320. Center each object at its cell center, contain it inside the central 70% of the cell, all similar optical scale. Pure white background everywhere; NO tile cards, NO borders, NO shadows outside objects, NO text, NO labels, NO numbers, NO dividers, NO outer margins, NO extra decorative objects. Exactly one listed item per cell. Order row-major left-to-right: 1: orange cat; 2: brown dog; 3: white rabbit with pink ears; 4: green turtle; 5: blue elephant; 6: black white penguin; 7: yellow black bee; 8: red ladybug; 9: orange snail; 10: red crab; 11: purple octopus; 12: blue dolphin; 13: blue whale with water spout; 14: green frog; 15: green leafy tree; 16: pink flower; 17: green cactus in coral pot; 18: rainbow; 19: white cloud with blue shading; 20: snowman with coral scarf. All shapes recognizable instantly even at 48 pixels. Preserve essential object anatomy.
```

### 圖集 5（v6 新增）

```text
Use case: illustration-story. Asset type: production sprite atlas, 20 NEW familiar everyday objects for an ages-7-to-elderly cognition game. The input image is STYLE REFERENCE ONLY; none of its objects should be repeated. Match its colorful, rounded, crisp flat illustration style with minimal gentle shading, blue teal coral yellow purple accents and natural recognizable object anatomy. Pure white background, no cards, no titles, no labels, no decoration. EXACTLY 5 columns by 4 rows on a 1600x1280 landscape canvas. Each object must be centered in its own equal square cell and fit within the central 72%, with generous pure white gutters separating every row and column. 20 objects in this exact row-major order: Row 1: black-and-white soccer ball, tennis racket with strings, acoustic guitar, drum with two drumsticks, yellow wooden pencil. Row 2: paintbrush with coral paint on bristles, blue ruler with measurement ticks, teal kettle with handle and spout, silver spoon, silver fork. Row 3: colorful toothbrush, purple comb, coral hair dryer, striped sock, yellow winter mitten. Row 4: green watering can, red horseshoe magnet with silver tips, wrapped blue gift box with coral bow, yellow flashlight, blue electric desk fan. No abstract symbols. Each item should be immediately identifiable at 48px. No overlapping or touching adjacent cells. No shadow outside objects. No text or numbers.
```
