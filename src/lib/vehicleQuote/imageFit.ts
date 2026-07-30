export type FitMode = "contain" | "cover";

export type ImageFitResult = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Fit an image into a box without stretching.
 * - contain: full image visible, letterboxed
 * - cover: fill box, overflow cropped (caller should clip)
 */
export function calculateImageFit(
  imageWidth: number,
  imageHeight: number,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number,
  mode: FitMode
): ImageFitResult {
  const safeImgW = Math.max(1, imageWidth);
  const safeImgH = Math.max(1, imageHeight);
  const imageRatio = safeImgW / safeImgH;
  const boxRatio = boxWidth / boxHeight;

  let width: number;
  let height: number;

  if (mode === "contain") {
    if (imageRatio > boxRatio) {
      width = boxWidth;
      height = boxWidth / imageRatio;
    } else {
      height = boxHeight;
      width = boxHeight * imageRatio;
    }
  } else if (imageRatio > boxRatio) {
    height = boxHeight;
    width = boxHeight * imageRatio;
  } else {
    width = boxWidth;
    height = boxWidth / imageRatio;
  }

  return {
    x: boxX + (boxWidth - width) / 2,
    y: boxY + (boxHeight - height) / 2,
    width,
    height,
  };
}

/**
 * Contain fit that avoids excessive upscaling of small source images.
 * Pixel→pt factor ~0.72 caps enlargement while still filling reasonably.
 */
export function calculateContainedImageFit(
  imageWidth: number,
  imageHeight: number,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number
): ImageFitResult {
  const fit = calculateImageFit(
    imageWidth,
    imageHeight,
    boxX,
    boxY,
    boxWidth,
    boxHeight,
    "contain"
  );

  const maxW = Math.max(1, imageWidth) * 0.72;
  const maxH = Math.max(1, imageHeight) * 0.72;
  if (fit.width <= maxW && fit.height <= maxH) {
    return fit;
  }

  const scale = Math.min(maxW / fit.width, maxH / fit.height, 1);
  const width = fit.width * scale;
  const height = fit.height * scale;
  return {
    x: boxX + (boxWidth - width) / 2,
    y: boxY + (boxHeight - height) / 2,
    width,
    height,
  };
}
