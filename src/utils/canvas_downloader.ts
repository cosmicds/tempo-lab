/** 
 * Utitlity function for downloading canvas content as an image file.
 */
export function downloadCanvasToImage(canvas: HTMLCanvasElement, filename: string = 'canvas_image.png') {
  console.log('Downloading canvas to image...');
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}