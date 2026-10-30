# 入口標題圖稿｜v10.3

使用內建 image_gen 生成；未使用 CLI/API fallback。依使用者最後確認的入口示意製作透明字稿，再將原始 PNG 不改像素地內嵌於 SVG，使用 viewBox 消除多餘透明留白。SVG 中的圖片為點陣圖，不是可編輯字型或向量字形。

## 大腦遊樂場

用途：中央主標。原始 PNG 尺寸 2172×724，顯示 viewBox 尺寸 2077×364。

最終生成提示：

> Use case: background-extraction / precise-object-edit. Extract ONLY the central title artwork "大腦遊樂場" from this approved website screenshot as a reusable transparent-background PNG wordmark. Reproduce its exact five Traditional Chinese characters 大 腦 遊 樂 場 with the same chunky deep navy letterforms, controlled playful rhythm, clear counters, no outlines or shadows. Retain the yellow circle inside 腦, the red dot atop 遊, the bright blue accent upper-right of 樂, and the paired teal-green rays after 場. All four accent colors MUST be present. Navy #082650, yellow #ffc318, red #ff5d61, blue #0868ef, teal-green #009fa9. IMPORTANT: isolate the approved wordmark faithfully; do not redesign or replace with a generic font. Remove ALL other website elements including English kicker, subtitle, brain mascot, brand text, cards and backgrounds. Output ONLY this one horizontal wordmark, straight-on crisp flat artwork, on REAL TRANSPARENT background. Tight framing with approximately 3% clear padding around visible artwork, wide aspect ratio around 6:1, generous resolution suitable for 2x desktop display. No checkerboard painted into image, no cream rectangle, no label, no annotation. The user approved this exact headline; maintain it.

## 心智大作戰

用途：左上品牌。原始 PNG 尺寸 2149×732，顯示 viewBox 尺寸 2004×367。

最終生成提示：

> Use case: background-extraction / precise-object-edit. Extract ONLY the upper-left brand lettering "心智大作戰" from this approved website screenshot as a reusable transparent-background PNG wordmark. Exactly five Traditional Chinese characters 心 智 大 作 戰. Preserve the approved quiet upright bold navy letterforms, straight horizontal baseline, even glyph sizes, balanced spacing, stable calm posture and subtle friendly corners. Color solid deep navy #082650. NO tilting, bouncing, color accents, emphasis rays, outline, shadow or mascot. Remove every other website element. Output ONLY the five-character horizontal wordmark "心智大作戰", on REAL TRANSPARENT background, crisp flat artwork, tightly framed with about 3% clear padding, wide aspect ratio around 5:1. No backdrop or checkerboard baked into image. Preserve the visual form in the approved upper-left brand while making the baseline fully steady. No English, no subtitles, no additional text. This is production artwork for the upper-left quiet brand, distinct from the playful central title.

## 編輯注意

- 文字內容也存在 `index.html` 的 h1 / h2 中，供輔助工具讀取。
- 版面比例、縮放與手機斷點由 `brain-title-art.css` 控制。
- 既有正文字型與其授權檔維持原狀。
