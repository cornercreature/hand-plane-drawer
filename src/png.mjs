// PNG physical resolution (pixels/metre); replace browser-supplied DPI metadata.
export function pngDpi(bytes,dpi){
  const chunk=new Uint8Array(21),view=new DataView(chunk.buffer),ppm=Math.round(dpi/0.0254);
  view.setUint32(0,9);chunk.set([112,72,89,115],4);view.setUint32(8,ppm);view.setUint32(12,ppm);chunk[16]=1;
  let crc=0xffffffff;
  for(const byte of chunk.subarray(4,17)){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  view.setUint32(17,(crc^0xffffffff)>>>0);
  const parts=[bytes.slice(0,33),chunk];
  for(let offset=33;offset<bytes.length;){const end=offset+12+new DataView(bytes.buffer,bytes.byteOffset+offset,4).getUint32(0);if(String.fromCharCode(...bytes.subarray(offset+4,offset+8))!=='pHYs')parts.push(bytes.slice(offset,end));offset=end;}
  return new Blob(parts,{type:'image/png'});
}
