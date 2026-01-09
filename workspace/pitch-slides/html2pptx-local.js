/**
 * html2pptx - Local version without sharp dependency
 */

const { chromium } = require('playwright');
const path = require('path');

const PT_PER_PX = 0.75;
const PX_PER_IN = 96;
const EMU_PER_IN = 914400;

async function getBodyDimensions(page) {
  const bodyDimensions = await page.evaluate(() => {
    const body = document.body;
    const style = window.getComputedStyle(body);
    return {
      width: parseFloat(style.width),
      height: parseFloat(style.height),
      scrollWidth: body.scrollWidth,
      scrollHeight: body.scrollHeight
    };
  });

  const errors = [];
  const widthOverflowPx = Math.max(0, bodyDimensions.scrollWidth - bodyDimensions.width - 1);
  const heightOverflowPx = Math.max(0, bodyDimensions.scrollHeight - bodyDimensions.height - 1);

  if (widthOverflowPx > 0 || heightOverflowPx > 0) {
    const directions = [];
    if (widthOverflowPx > 0) directions.push(`${(widthOverflowPx * PT_PER_PX).toFixed(1)}pt horizontally`);
    if (heightOverflowPx > 0) directions.push(`${(heightOverflowPx * PT_PER_PX).toFixed(1)}pt vertically`);
    errors.push(`Content overflows by ${directions.join(' and ')}`);
  }

  return { ...bodyDimensions, errors };
}

function validateDimensions(bodyDimensions, pres) {
  const errors = [];
  const widthInches = bodyDimensions.width / PX_PER_IN;
  const heightInches = bodyDimensions.height / PX_PER_IN;

  if (pres.presLayout) {
    const layoutWidth = pres.presLayout.width / EMU_PER_IN;
    const layoutHeight = pres.presLayout.height / EMU_PER_IN;

    if (Math.abs(layoutWidth - widthInches) > 0.1 || Math.abs(layoutHeight - heightInches) > 0.1) {
      errors.push(
        `HTML dimensions (${widthInches.toFixed(1)}" × ${heightInches.toFixed(1)}") ` +
        `don't match layout (${layoutWidth.toFixed(1)}" × ${layoutHeight.toFixed(1)}")`
      );
    }
  }
  return errors;
}

async function addBackground(slideData, targetSlide, tmpDir) {
  if (slideData.background.type === 'image' && slideData.background.path) {
    let imagePath = slideData.background.path.startsWith('file://')
      ? slideData.background.path.replace('file://', '')
      : slideData.background.path;
    targetSlide.background = { path: imagePath };
  } else if (slideData.background.type === 'color' && slideData.background.value) {
    targetSlide.background = { color: slideData.background.value };
  }
}

function addElements(slideData, targetSlide, pres) {
  for (const el of slideData.elements) {
    if (el.type === 'image') {
      let imagePath = el.src.startsWith('file://') ? el.src.replace('file://', '') : el.src;
      targetSlide.addImage({
        path: imagePath,
        x: el.position.x,
        y: el.position.y,
        w: el.position.w,
        h: el.position.h
      });
    } else if (el.type === 'line') {
      targetSlide.addShape(pres.ShapeType.line, {
        x: el.x1,
        y: el.y1,
        w: el.x2 - el.x1,
        h: el.y2 - el.y1,
        line: { color: el.color, width: el.width }
      });
    } else if (el.type === 'shape') {
      const shapeOptions = {
        x: el.position.x,
        y: el.position.y,
        w: el.position.w,
        h: el.position.h,
        shape: el.shape.rectRadius > 0 ? pres.ShapeType.roundRect : pres.ShapeType.rect
      };

      if (el.shape.fill) {
        shapeOptions.fill = { color: el.shape.fill };
        if (el.shape.transparency != null) shapeOptions.fill.transparency = el.shape.transparency;
      }
      if (el.shape.line) shapeOptions.line = el.shape.line;
      if (el.shape.rectRadius > 0) shapeOptions.rectRadius = el.shape.rectRadius;
      if (el.shape.shadow) shapeOptions.shadow = el.shape.shadow;

      targetSlide.addText(el.text || '', shapeOptions);
    } else if (el.type === 'list') {
      const listOptions = {
        x: el.position.x,
        y: el.position.y,
        w: el.position.w,
        h: el.position.h,
        fontSize: el.style.fontSize,
        fontFace: el.style.fontFace,
        color: el.style.color,
        align: el.style.align,
        valign: 'top',
        lineSpacing: el.style.lineSpacing,
        paraSpaceBefore: el.style.paraSpaceBefore,
        paraSpaceAfter: el.style.paraSpaceAfter,
        margin: el.style.margin
      };
      if (el.style.margin) listOptions.margin = el.style.margin;
      targetSlide.addText(el.items, listOptions);
    } else {
      const lineHeight = el.style.lineSpacing || el.style.fontSize * 1.2;
      const isSingleLine = el.position.h <= lineHeight * 1.5;

      let adjustedX = el.position.x;
      let adjustedW = el.position.w;

      if (isSingleLine) {
        const widthIncrease = el.position.w * 0.02;
        const align = el.style.align;

        if (align === 'center') {
          adjustedX = el.position.x - (widthIncrease / 2);
          adjustedW = el.position.w + widthIncrease;
        } else if (align === 'right') {
          adjustedX = el.position.x - widthIncrease;
          adjustedW = el.position.w + widthIncrease;
        } else {
          adjustedW = el.position.w + widthIncrease;
        }
      }

      const textOptions = {
        x: adjustedX,
        y: el.position.y,
        w: adjustedW,
        h: el.position.h,
        fontSize: el.style.fontSize,
        fontFace: el.style.fontFace,
        color: el.style.color,
        bold: el.style.bold,
        italic: el.style.italic,
        underline: el.style.underline,
        valign: 'top',
        lineSpacing: el.style.lineSpacing,
        paraSpaceBefore: el.style.paraSpaceBefore,
        paraSpaceAfter: el.style.paraSpaceAfter,
        inset: 0
      };

      if (el.style.align) textOptions.align = el.style.align;
      if (el.style.margin) textOptions.margin = el.style.margin;
      if (el.style.rotate !== undefined) textOptions.rotate = el.style.rotate;
      if (el.style.transparency !== null && el.style.transparency !== undefined) textOptions.transparency = el.style.transparency;

      targetSlide.addText(el.text, textOptions);
    }
  }
}

async function extractSlideData(page) {
  return await page.evaluate(() => {
    const PT_PER_PX = 0.75;
    const PX_PER_IN = 96;

    const pxToInch = (px) => px / PX_PER_IN;
    const pxToPoints = (pxStr) => parseFloat(pxStr) * PT_PER_PX;
    const rgbToHex = (rgbStr) => {
      if (rgbStr === 'rgba(0, 0, 0, 0)' || rgbStr === 'transparent') return 'FFFFFF';
      const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return 'FFFFFF';
      return match.slice(1).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    };

    const extractAlpha = (rgbStr) => {
      const match = rgbStr.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (!match || !match[4]) return null;
      return Math.round((1 - parseFloat(match[4])) * 100);
    };

    const parseBoxShadow = (boxShadow) => {
      if (!boxShadow || boxShadow === 'none') return null;
      if (boxShadow.match(/inset/)) return null;

      const colorMatch = boxShadow.match(/rgba?\([^)]+\)/);
      const parts = boxShadow.match(/([-\d.]+)(px|pt)/g);
      if (!parts || parts.length < 2) return null;

      const offsetX = parseFloat(parts[0]);
      const offsetY = parseFloat(parts[1]);
      const blur = parts.length > 2 ? parseFloat(parts[2]) : 0;

      let angle = 0;
      if (offsetX !== 0 || offsetY !== 0) {
        angle = Math.atan2(offsetY, offsetX) * (180 / Math.PI);
        if (angle < 0) angle += 360;
      }

      const offset = Math.sqrt(offsetX * offsetX + offsetY * offsetY) * PT_PER_PX;

      let opacity = 0.5;
      if (colorMatch) {
        const opacityMatch = colorMatch[0].match(/[\d.]+\)$/);
        if (opacityMatch) opacity = parseFloat(opacityMatch[0].replace(')', ''));
      }

      return {
        type: 'outer',
        angle: Math.round(angle),
        blur: blur * 0.75,
        color: colorMatch ? rgbToHex(colorMatch[0]) : '000000',
        offset: offset,
        opacity
      };
    };

    const parseInlineFormatting = (element, baseOptions = {}, runs = []) => {
      element.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE || node.tagName === 'BR') {
          const text = node.tagName === 'BR' ? '\n' : node.textContent.replace(/\s+/g, ' ');
          runs.push({ text, options: { ...baseOptions } });
        } else if (node.nodeType === Node.ELEMENT_NODE && node.textContent.trim()) {
          const options = { ...baseOptions };
          const computed = window.getComputedStyle(node);

          if (['SPAN', 'B', 'STRONG', 'I', 'EM', 'U'].includes(node.tagName)) {
            const isBold = computed.fontWeight === 'bold' || parseInt(computed.fontWeight) >= 600;
            if (isBold) options.bold = true;
            if (computed.fontStyle === 'italic') options.italic = true;
            if (computed.textDecoration && computed.textDecoration.includes('underline')) options.underline = true;
            if (computed.color && computed.color !== 'rgb(0, 0, 0)') {
              options.color = rgbToHex(computed.color);
            }
            if (computed.fontSize) options.fontSize = pxToPoints(computed.fontSize);

            parseInlineFormatting(node, options, runs);
          }
        }
      });

      if (runs.length > 0) {
        runs[0].text = runs[0].text.replace(/^\s+/, '');
        runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\s+$/, '');
      }

      return runs.filter(r => r.text.length > 0);
    };

    const body = document.body;
    const bodyStyle = window.getComputedStyle(body);
    const bgColor = bodyStyle.backgroundColor;

    let background = { type: 'color', value: rgbToHex(bgColor) };

    const elements = [];
    const placeholders = [];
    const textTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI'];
    const processed = new Set();
    const errors = [];

    document.querySelectorAll('*').forEach((el) => {
      if (processed.has(el)) return;

      if (el.className && el.className.includes && el.className.includes('placeholder')) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          placeholders.push({
            id: el.id || `placeholder-${placeholders.length}`,
            x: pxToInch(rect.left),
            y: pxToInch(rect.top),
            w: pxToInch(rect.width),
            h: pxToInch(rect.height)
          });
        }
        processed.add(el);
        return;
      }

      if (el.tagName === 'IMG') {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          elements.push({
            type: 'image',
            src: el.src,
            position: {
              x: pxToInch(rect.left),
              y: pxToInch(rect.top),
              w: pxToInch(rect.width),
              h: pxToInch(rect.height)
            }
          });
          processed.add(el);
          return;
        }
      }

      if (el.tagName === 'DIV' && !textTags.includes(el.tagName)) {
        const computed = window.getComputedStyle(el);
        const hasBg = computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)';

        const borderTop = parseFloat(computed.borderTopWidth) || 0;
        const borderRight = parseFloat(computed.borderRightWidth) || 0;
        const borderBottom = parseFloat(computed.borderBottomWidth) || 0;
        const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
        const borders = [borderTop, borderRight, borderBottom, borderLeft];
        const hasBorder = borders.some(b => b > 0);
        const hasUniformBorder = hasBorder && borders.every(b => b === borders[0]);
        const borderLines = [];

        if (hasBorder && !hasUniformBorder) {
          const rect = el.getBoundingClientRect();
          const x = pxToInch(rect.left);
          const y = pxToInch(rect.top);
          const w = pxToInch(rect.width);
          const h = pxToInch(rect.height);

          if (borderTop > 0) {
            const widthPt = borderTop * PT_PER_PX;
            const inset = (widthPt / 72) / 2;
            borderLines.push({ type: 'line', x1: x, y1: y + inset, x2: x + w, y2: y + inset, width: widthPt, color: rgbToHex(computed.borderTopColor) });
          }
          if (borderRight > 0) {
            const widthPt = borderRight * PT_PER_PX;
            const inset = (widthPt / 72) / 2;
            borderLines.push({ type: 'line', x1: x + w - inset, y1: y, x2: x + w - inset, y2: y + h, width: widthPt, color: rgbToHex(computed.borderRightColor) });
          }
          if (borderBottom > 0) {
            const widthPt = borderBottom * PT_PER_PX;
            const inset = (widthPt / 72) / 2;
            borderLines.push({ type: 'line', x1: x, y1: y + h - inset, x2: x + w, y2: y + h - inset, width: widthPt, color: rgbToHex(computed.borderBottomColor) });
          }
          if (borderLeft > 0) {
            const widthPt = borderLeft * PT_PER_PX;
            const inset = (widthPt / 72) / 2;
            borderLines.push({ type: 'line', x1: x + inset, y1: y, x2: x + inset, y2: y + h, width: widthPt, color: rgbToHex(computed.borderLeftColor) });
          }
        }

        if (hasBg || hasBorder) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const shadow = parseBoxShadow(computed.boxShadow);

            if (hasBg || hasUniformBorder) {
              const radiusValue = parseFloat(computed.borderRadius);
              let rectRadius = 0;
              if (radiusValue > 0) {
                if (computed.borderRadius.includes('%')) {
                  if (radiusValue >= 50) rectRadius = 1;
                  else {
                    const minDim = Math.min(rect.width, rect.height);
                    rectRadius = (radiusValue / 100) * pxToInch(minDim);
                  }
                } else if (computed.borderRadius.includes('pt')) {
                  rectRadius = radiusValue / 72;
                } else {
                  rectRadius = radiusValue / PX_PER_IN;
                }
              }

              elements.push({
                type: 'shape',
                text: '',
                position: {
                  x: pxToInch(rect.left),
                  y: pxToInch(rect.top),
                  w: pxToInch(rect.width),
                  h: pxToInch(rect.height)
                },
                shape: {
                  fill: hasBg ? rgbToHex(computed.backgroundColor) : null,
                  transparency: hasBg ? extractAlpha(computed.backgroundColor) : null,
                  line: hasUniformBorder ? { color: rgbToHex(computed.borderColor), width: borderTop * PT_PER_PX } : null,
                  rectRadius: rectRadius,
                  shadow: shadow
                }
              });
            }

            elements.push(...borderLines);
            processed.add(el);
            return;
          }
        }
      }

      if (el.tagName === 'UL' || el.tagName === 'OL') {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const liElements = Array.from(el.querySelectorAll('li'));
        const items = [];
        const ulComputed = window.getComputedStyle(el);
        const ulPaddingLeftPt = pxToPoints(ulComputed.paddingLeft);
        const marginLeft = ulPaddingLeftPt * 0.5;
        const textIndent = ulPaddingLeftPt * 0.5;

        liElements.forEach((li, idx) => {
          const isLast = idx === liElements.length - 1;
          const runs = parseInlineFormatting(li, { breakLine: false });
          if (runs.length > 0) {
            runs[0].text = runs[0].text.replace(/^[•\-\*▪▸]\s*/, '');
            runs[0].options.bullet = { indent: textIndent };
          }
          if (runs.length > 0 && !isLast) {
            runs[runs.length - 1].options.breakLine = true;
          }
          items.push(...runs);
        });

        const computed = window.getComputedStyle(liElements[0] || el);

        elements.push({
          type: 'list',
          items: items,
          position: {
            x: pxToInch(rect.left),
            y: pxToInch(rect.top),
            w: pxToInch(rect.width),
            h: pxToInch(rect.height)
          },
          style: {
            fontSize: pxToPoints(computed.fontSize),
            fontFace: computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
            color: rgbToHex(computed.color),
            align: computed.textAlign === 'start' ? 'left' : computed.textAlign,
            lineSpacing: computed.lineHeight && computed.lineHeight !== 'normal' ? pxToPoints(computed.lineHeight) : null,
            paraSpaceBefore: 0,
            paraSpaceAfter: pxToPoints(computed.marginBottom),
            margin: [marginLeft, 0, 0, 0]
          }
        });

        liElements.forEach(li => processed.add(li));
        processed.add(el);
        return;
      }

      if (!textTags.includes(el.tagName)) return;

      const rect = el.getBoundingClientRect();
      const text = el.textContent.trim();
      if (rect.width === 0 || rect.height === 0 || !text) return;

      const computed = window.getComputedStyle(el);

      const baseStyle = {
        fontSize: pxToPoints(computed.fontSize),
        fontFace: computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
        color: rgbToHex(computed.color),
        align: computed.textAlign === 'start' ? 'left' : computed.textAlign,
        lineSpacing: pxToPoints(computed.lineHeight),
        paraSpaceBefore: pxToPoints(computed.marginTop),
        paraSpaceAfter: pxToPoints(computed.marginBottom),
        margin: [
          pxToPoints(computed.paddingLeft),
          pxToPoints(computed.paddingRight),
          pxToPoints(computed.paddingBottom),
          pxToPoints(computed.paddingTop)
        ]
      };

      const transparency = extractAlpha(computed.color);
      if (transparency !== null) baseStyle.transparency = transparency;

      const hasFormatting = el.querySelector('b, i, u, strong, em, span, br');

      if (hasFormatting) {
        const runs = parseInlineFormatting(el, {});
        elements.push({
          type: el.tagName.toLowerCase(),
          text: runs,
          position: { x: pxToInch(rect.left), y: pxToInch(rect.top), w: pxToInch(rect.width), h: pxToInch(rect.height) },
          style: baseStyle
        });
      } else {
        const isBold = computed.fontWeight === 'bold' || parseInt(computed.fontWeight) >= 600;

        elements.push({
          type: el.tagName.toLowerCase(),
          text: text,
          position: { x: pxToInch(rect.left), y: pxToInch(rect.top), w: pxToInch(rect.width), h: pxToInch(rect.height) },
          style: {
            ...baseStyle,
            bold: isBold,
            italic: computed.fontStyle === 'italic',
            underline: computed.textDecoration.includes('underline')
          }
        });
      }

      processed.add(el);
    });

    return { background, elements, placeholders, errors };
  });
}

async function html2pptx(htmlFile, pres, options = {}) {
  const { tmpDir = process.env.TMPDIR || '/tmp', slide = null } = options;

  try {
    const launchOptions = { env: { TMPDIR: tmpDir } };
    if (process.platform === 'darwin') {
      launchOptions.channel = 'chrome';
    }

    const browser = await chromium.launch(launchOptions);
    let bodyDimensions;
    let slideData;

    const filePath = path.isAbsolute(htmlFile) ? htmlFile : path.join(process.cwd(), htmlFile);

    try {
      const page = await browser.newPage();
      await page.goto(`file://${filePath}`);
      bodyDimensions = await getBodyDimensions(page);
      await page.setViewportSize({
        width: Math.round(bodyDimensions.width),
        height: Math.round(bodyDimensions.height)
      });
      slideData = await extractSlideData(page);
    } finally {
      await browser.close();
    }

    const validationErrors = [];
    if (bodyDimensions.errors) validationErrors.push(...bodyDimensions.errors);
    const dimensionErrors = validateDimensions(bodyDimensions, pres);
    if (dimensionErrors.length > 0) validationErrors.push(...dimensionErrors);
    if (slideData.errors) validationErrors.push(...slideData.errors);

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('\n'));
    }

    const targetSlide = slide || pres.addSlide();
    await addBackground(slideData, targetSlide, tmpDir);
    addElements(slideData, targetSlide, pres);

    return { slide: targetSlide, placeholders: slideData.placeholders };
  } catch (error) {
    throw new Error(`${htmlFile}: ${error.message}`);
  }
}

module.exports = html2pptx;
