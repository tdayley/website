// Runs in the browser. Turns a photo of any size into a JPEG at most MAX pixels
// on its longer side, so uploads are quick on mobile data. Returns null if the
// file isn't a picture the browser can read.
const MAX = 1200;

async function load(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void } | null> {
	try {
		const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
		return { source: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() };
	} catch {
		// Older browsers: fall back to an <img>.
	}
	const url = URL.createObjectURL(file);
	try {
		const img = new Image();
		img.src = url;
		await img.decode();
		return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
	} catch {
		URL.revokeObjectURL(url);
		return null;
	}
}

export async function shrinkPhoto(file: File): Promise<Blob | null> {
	const picture = await load(file);
	if (!picture || !picture.width || !picture.height) return null;
	try {
		const scale = Math.min(1, MAX / Math.max(picture.width, picture.height));
		const canvas = document.createElement('canvas');
		canvas.width = Math.max(1, Math.round(picture.width * scale));
		canvas.height = Math.max(1, Math.round(picture.height * scale));
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		// White behind transparent pictures (JPEG has no transparency).
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(picture.source, 0, 0, canvas.width, canvas.height);
		return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
	} finally {
		picture.done();
	}
}
