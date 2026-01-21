import sharp from "sharp";

const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

type ProcessedImage = {
  buffer: Buffer;
  ext: string;
  mime: string;
};

type ImageKind = "photo" | "logo";

const resizeByKind: Record<ImageKind, number> = {
  photo: 1600,
  logo: 1200,
};

const encodeJpeg = async (image: sharp.Sharp, quality: number) =>
  image.jpeg({ quality, mozjpeg: true }).toBuffer();

export const processImageUpload = async (
  input: Buffer,
  options: { kind: ImageKind; mime: string }
): Promise<ProcessedImage> => {
  const maxSize = resizeByKind[options.kind];
  const base = sharp(input).rotate().resize({
    width: maxSize,
    height: maxSize,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (options.kind === "photo") {
    let output = await encodeJpeg(base, 82);
    if (output.length > MAX_OUTPUT_BYTES) {
      output = await encodeJpeg(base, 72);
    }
    if (output.length > MAX_OUTPUT_BYTES) {
      output = await encodeJpeg(base, 62);
    }
    return { buffer: output, ext: ".jpg", mime: "image/jpeg" };
  }

  if (options.mime === "image/png") {
    let output = await base.png({ compressionLevel: 9 }).toBuffer();
    if (output.length <= MAX_OUTPUT_BYTES) {
      return { buffer: output, ext: ".png", mime: "image/png" };
    }
  }

  let output = await encodeJpeg(base, 82);
  if (output.length > MAX_OUTPUT_BYTES) {
    output = await encodeJpeg(base, 72);
  }
  return { buffer: output, ext: ".jpg", mime: "image/jpeg" };
};
